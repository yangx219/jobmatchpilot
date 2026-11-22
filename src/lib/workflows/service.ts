import "server-only";

import db from "@/lib/db";
import { AgentWorkflowType } from "@prisma/client";
import type { CreateAgentWorkflowInput } from "@/models/workflow.schema";
import { AGENT_PROMPT_VERSIONS } from "@/models/workflow.schema";
import { APP_CONSTANTS } from "@/lib/constants";
import { createHash } from "node:crypto";
import MarkdownIt from "markdown-it";
import { buildCoverLetterTitle } from "@/lib/coverLetterTitle";
import { ResumeTailorOutputSchema } from "@/models/resumeTailor.schema";
import { applyResumeTextReplacement, cloneResumeInTransaction } from "@/lib/resumes/clone";

export class WorkflowResourceNotFoundError extends Error {}
export class WorkflowQuotaExceededError extends Error {
  constructor(
    public readonly code: "daily_limit" | "active_limit",
    public readonly retryAfterSeconds: number,
  ) {
    super(code);
  }
}

function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function createAgentWorkflow(
  userId: string,
  input: CreateAgentWorkflowInput,
  idempotencyKey: string | null,
) {
  if (idempotencyKey) {
    const existing = await db.agentWorkflow.findFirst({
      where: { userId, idempotencyKey },
      include: { steps: { orderBy: { position: "asc" } }, analysis: true, auditEvents: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
    if (existing) return { workflow: existing, created: false };
  }

  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const workflowType = input.type === "cover_letter" ? AgentWorkflowType.COVER_LETTER : input.type === "resume_tailor" ? AgentWorkflowType.RESUME_TAILOR : AgentWorkflowType.JOB_MATCH;
  const promptVersion = input.type === "cover_letter" ? AGENT_PROMPT_VERSIONS.coverLetter : input.type === "resume_tailor" ? AGENT_PROMPT_VERSIONS.resumeTailor : AGENT_PROMPT_VERSIONS.jobMatch;
  const [createdToday, active] = await Promise.all([
    db.agentWorkflow.count({
      where: { userId, type: workflowType, createdAt: { gte: dayStart } },
    }),
    db.agentWorkflow.count({
      where: { userId, type: workflowType, status: { in: ["QUEUED", "RUNNING"] } },
    }),
  ]);
  if (createdToday >= APP_CONSTANTS.AI_JOB_MATCH_DAILY_LIMIT) {
    const nextDay = new Date(dayStart.getTime() + 86_400_000);
    throw new WorkflowQuotaExceededError(
      "daily_limit",
      Math.max(1, Math.ceil((nextDay.getTime() - now.getTime()) / 1000)),
    );
  }
  if (active >= APP_CONSTANTS.AI_JOB_MATCH_ACTIVE_LIMIT) {
    throw new WorkflowQuotaExceededError("active_limit", 30);
  }

  const job = await db.job.findFirst({
    where: { id: input.jobId, userId },
    select: {
      id: true,
      resumeId: true,
      description: true,
      jobTitleId: true,
      companyId: true,
      locationId: true,
      jobType: true,
      salaryRange: true,
    },
  });
  const requestedResumeId = input.resumeId ?? job?.resumeId ?? (
    await db.user.findUnique({ where: { id: userId }, select: { defaultResumeId: true } })
  )?.defaultResumeId ?? undefined;
  const resume = requestedResumeId
    ? await db.resume.findFirst({ where: { id: requestedResumeId, profile: { userId } }, select: { id: true, updatedAt: true } })
    : await db.resume.findFirst({ where: { profile: { userId } }, orderBy: { updatedAt: "desc" }, select: { id: true, updatedAt: true } });
  if (!job || !resume) throw new WorkflowResourceNotFoundError();

  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  const inputFingerprint = createHash("sha256")
    .update(JSON.stringify({
      job: [job.id, job.description, job.jobTitleId, job.companyId, job.locationId, job.jobType, job.salaryRange],
      resume: [resume.id, resume.updatedAt.toISOString()],
      settings: settings?.updatedAt.toISOString() ?? "no-settings",
      prompt: promptVersion,
    }))
    .digest("hex");
  if (!input.force) {
    const cached = await db.agentWorkflow.findFirst({
      where: { userId, inputFingerprint, status: "COMPLETED" },
      include: { steps: { orderBy: { position: "asc" } }, analysis: true },
      orderBy: { completedAt: "desc" },
    });
    if (cached) return { workflow: cached, created: false };
  }

  const workflow = await db.agentWorkflow.create({
    data: {
      userId,
      type: workflowType,
      jobId: job.id,
      resumeId: resume.id,
      idempotencyKey,
      promptVersion,
      inputFingerprint,
      steps: {
        create: [
          { name: "prepare_context", position: 0 },
          { name: input.type === "cover_letter" ? "generate_letter" : input.type === "resume_tailor" ? "generate_suggestions" : "generate_match", position: 1 },
          { name: "validate_output", position: 2 },
          { name: input.type === "job_match" ? "persist_analysis" : "await_approval", position: 3 },
        ],
      },
      auditEvents: {
        create: { action: "workflow.created", actorType: "user", actorId: userId, metadata: JSON.stringify({ type: input.type, promptVersion, inputFingerprint }) },
      },
    },
    include: { steps: { orderBy: { position: "asc" } }, analysis: true, auditEvents: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  return { workflow, created: true };
}

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });

export async function approveCoverLetterWorkflow(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.agentWorkflow.updateMany({
      where: { id, userId, type: "COVER_LETTER", status: "WAITING_APPROVAL" },
      data: { status: "RUNNING", lockedBy: "approval", lockedAt: new Date() },
    });
    if (claimed.count === 0) return null;
    const workflow = await tx.agentWorkflow.findFirst({
      where: { id, userId, type: "COVER_LETTER", status: "RUNNING", lockedBy: "approval" },
      include: { job: { include: { JobTitle: true, Company: true } } },
    });
    if (!workflow?.job || !workflow.output) return null;
    const profile = await tx.profile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new WorkflowResourceNotFoundError();
    const existing = await tx.coverLetter.findMany({ where: { profileId: profile.id }, select: { title: true } });
    const title = buildCoverLetterTitle(workflow.job.JobTitle.label, workflow.job.Company.label, existing.map((item) => item.title));
    const letter = await tx.coverLetter.create({ data: { profileId: profile.id, title, content: markdown.render(workflow.output) } });
    await tx.job.update({ where: { id: workflow.job.id, userId }, data: { coverLetterId: letter.id } });
    await tx.agentStep.update({ where: { workflowId_position: { workflowId: id, position: 3 } }, data: { status: "COMPLETED", completedAt: new Date(), output: JSON.stringify({ coverLetterId: letter.id }) } });
    await tx.agentWorkflow.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date(), lockedAt: null, lockedBy: null } });
    await tx.agentAuditEvent.create({ data: { workflowId: id, action: "draft.approved", actorType: "user", actorId: userId, metadata: JSON.stringify({ coverLetterId: letter.id }) } });
    return letter;
  });
}

export async function approveResumeTailorWorkflow(userId: string, id: string, selectedIndexes: number[]) {
  const indexes = [...new Set(selectedIndexes)].sort((a, b) => a - b);
  if (indexes.length === 0) throw new Error("no_suggestions_selected");
  return db.$transaction(async (tx) => {
    const claimed = await tx.agentWorkflow.updateMany({ where: { id, userId, type: "RESUME_TAILOR", status: "WAITING_APPROVAL" }, data: { status: "RUNNING", lockedBy: "approval", lockedAt: new Date() } });
    if (claimed.count === 0) return null;
    const workflow = await tx.agentWorkflow.findFirst({ where: { id, userId, type: "RESUME_TAILOR", status: "RUNNING", lockedBy: "approval" }, include: { resume: true, job: { include: { JobTitle: true, Company: true } } } });
    if (!workflow?.resume || !workflow.job || !workflow.output) return null;
    const parsed = ResumeTailorOutputSchema.parse(JSON.parse(workflow.output));
    const selected = indexes.map((index) => parsed.suggestions[index]);
    if (selected.some((item) => !item)) throw new Error("invalid_suggestion_index");
    const copy = await cloneResumeInTransaction(tx, userId, workflow.resume.id, `${workflow.resume.title} — ${workflow.job.JobTitle.label}`);
    for (const suggestion of selected) await applyResumeTextReplacement(tx, copy.id, suggestion.original, suggestion.proposed);
    await tx.agentStep.update({ where: { workflowId_position: { workflowId: id, position: 3 } }, data: { status: "COMPLETED", completedAt: new Date(), output: JSON.stringify({ resumeId: copy.id, appliedSuggestions: indexes }) } });
    await tx.agentWorkflow.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date(), lockedAt: null, lockedBy: null } });
    await tx.agentAuditEvent.create({ data: { workflowId: id, action: "resume_suggestions.approved", actorType: "user", actorId: userId, metadata: JSON.stringify({ resumeId: copy.id, selectedIndexes: indexes }) } });
    return copy;
  }, { timeout: 15_000 });
}

export async function getAgentWorkflow(userId: string, id: string) {
  return db.agentWorkflow.findFirst({
    where: { id, userId },
    include: { steps: { orderBy: { position: "asc" } }, analysis: true, auditEvents: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
}

export async function cancelAgentWorkflow(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const result = await tx.agentWorkflow.updateMany({
      where: { id, userId, status: { in: ["QUEUED", "RUNNING", "WAITING_APPROVAL"] } },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        errorCode: "cancelled_by_user",
        lockedAt: null,
        lockedBy: null,
      },
    });
    if (result.count === 0) return false;
    await tx.agentStep.updateMany({
      where: { workflowId: id, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED", completedAt: new Date(), errorCode: "cancelled_by_user" },
    });
    await tx.agentAuditEvent.create({ data: { workflowId: id, action: "workflow.cancelled", actorType: "user", actorId: userId } });
    return true;
  });
}
