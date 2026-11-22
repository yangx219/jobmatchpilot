import { randomUUID } from "node:crypto";
import { generateText } from "ai";
import db from "@/lib/db";
import { APP_CONSTANTS, SCHEDULER_CONSTANTS } from "@/lib/constants";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { preprocessJob } from "@/lib/ai/tools/preprocessing-job";
import { getModel } from "@/lib/ai/providers";
import { MissingCredentialError } from "@/lib/ai/tools/errors";
import { getUserAiSettings } from "@/lib/scraper";
import { JOB_MATCH_SYSTEM_PROMPT, buildJobMatchPrompt } from "@/lib/ai/prompts/job-match";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";
import { validateJobMatchResult } from "@/lib/ai/jobMatch/validate";
import { TEMPERATURES } from "@/lib/ai/config";
import type { Resume } from "@/models/profile.model";
import type { JobResponse } from "@/models/job.model";
import { log } from "@/lib/telemetry";
import { startAiCall } from "@/lib/aiUsage/tracker";
import { COVER_LETTER_SYSTEM_PROMPT, buildCoverLetterPrompt } from "@/lib/ai/prompts/cover-letter";
import { extractMatchGuidance } from "@/lib/ai/coverLetter/matchGuidance";
import { stripThinking } from "@/lib/ai/stripThinking";
import { RESUME_TAILOR_SYSTEM_PROMPT, buildResumeTailorPrompt } from "@/lib/ai/prompts/resume-tailor";
import { ResumeTailorOutputSchema } from "@/models/resumeTailor.schema";

type ClaimedWorkflow = {
  id: string;
  userId: string;
  jobId: string | null;
  resumeId: string | null;
  promptVersion: string;
  attempt: number;
  type: "JOB_MATCH" | "COVER_LETTER" | "RESUME_TAILOR";
};

const workerId = `${process.pid}-${randomUUID()}`;

export async function recoverStaleAgentWorkflows(now = new Date()) {
  const cutoff = new Date(now.getTime() - SCHEDULER_CONSTANTS.REQUEST_STALE_MS);
  await db.agentStep.updateMany({
    where: { workflow: { status: "RUNNING", lockedAt: { lt: cutoff } }, status: "RUNNING" },
    data: { status: "QUEUED", errorCode: "worker_interrupted", startedAt: null },
  });
  return db.agentWorkflow.updateMany({
    where: { status: "RUNNING", lockedAt: { lt: cutoff } },
    data: { status: "QUEUED", availableAt: now, lockedAt: null, lockedBy: null, errorCode: "worker_interrupted" },
  });
}

export async function claimAgentWorkflow(): Promise<ClaimedWorkflow | null> {
  const rows = await db.$queryRaw<ClaimedWorkflow[]>`
    UPDATE "AgentWorkflow"
    SET "status" = 'RUNNING', "attempt" = "attempt" + 1,
        "lockedAt" = NOW(), "lockedBy" = ${workerId},
        "startedAt" = COALESCE("startedAt", NOW()), "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id" FROM "AgentWorkflow"
      WHERE "status" = 'QUEUED' AND "availableAt" <= NOW()
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING "id", "userId", "jobId", "resumeId", "promptVersion", "attempt", "type"
  `;
  return rows[0] ?? null;
}

async function beginStep(workflowId: string, position: number, provider?: string, model?: string) {
  await db.agentStep.update({
    where: { workflowId_position: { workflowId, position } },
    data: { status: "RUNNING", attempt: { increment: 1 }, startedAt: new Date(), completedAt: null, errorCode: null, provider, model },
  });
}

async function completeStep(workflowId: string, position: number, output?: string) {
  await db.agentStep.update({
    where: { workflowId_position: { workflowId, position } },
    data: { status: "COMPLETED", completedAt: new Date(), output },
  });
}

async function workflowStillRunning(id: string) {
  return (await db.agentWorkflow.count({ where: { id, status: "RUNNING" } })) === 1;
}

// A provider call is outside our database transaction, so cancellation has to
// be observed while the call is in flight and checked again before any result
// is persisted. The final state check is the correctness boundary; aborting is
// a best-effort latency/cost optimisation because a provider may ignore it.
function monitorWorkflowExecution(workflowId: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const cancellationPoll = setInterval(() => {
    void workflowStillRunning(workflowId)
      .then((running) => {
        if (!running) controller.abort();
      })
      .catch(() => undefined);
  }, 750);

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      clearInterval(cancellationPoll);
    },
  };
}

async function executeJobMatch(workflow: ClaimedWorkflow) {
  if (!workflow.jobId || !workflow.resumeId) throw new Error("workflow_subject_missing");

  await beginStep(workflow.id, 0);
  const [job, resume, ai] = await Promise.all([
    db.job.findFirst({
      where: { id: workflow.jobId, userId: workflow.userId },
      include: { JobTitle: true, Company: true, Location: true },
    }),
    db.resume.findFirst({
      where: { id: workflow.resumeId, profile: { userId: workflow.userId } },
      include: resumeDetailInclude,
    }),
    getUserAiSettings(workflow.userId),
  ]);
  if (!job || !resume) throw new Error("workflow_subject_missing");
  if (!ai.model) throw new Error("model_not_configured");

  const [resumePre, jobPre] = await Promise.all([
    preprocessResume(resume as unknown as Resume),
    preprocessJob(job as unknown as JobResponse),
  ]);
  if (!resumePre.success) throw new Error(`resume_${resumePre.error.code.toLowerCase()}`);
  if (!jobPre.success) throw new Error(`job_${jobPre.error.code.toLowerCase()}`);
  await completeStep(workflow.id, 0, JSON.stringify({ resumeChars: resumePre.data.normalizedText.length, jobChars: jobPre.data.normalizedText.length }));

  if (!(await workflowStillRunning(workflow.id))) return;
  await beginStep(workflow.id, 1, ai.provider, ai.model);
  const model = await getModel(ai.provider, ai.model, workflow.userId);
  const execution = monitorWorkflowExecution(workflow.id, APP_CONSTANTS.AI_JOB_MATCH_TIMEOUT_MS);
  let generated;
  const tracker = startAiCall({
    userId: workflow.userId,
    feature: "job_match",
    provider: ai.provider,
    model: ai.model,
  });
  try {
    generated = await generateText({
      model,
      system: JOB_MATCH_SYSTEM_PROMPT,
      prompt: buildJobMatchPrompt(resumePre.data.normalizedText, jobPre.data.normalizedText),
      temperature: TEMPERATURES.FEEDBACK,
      abortSignal: execution.signal,
    });
    void tracker.finish({ usage: generated.totalUsage, finishReason: generated.finishReason });
  } catch (error) {
    void tracker.finish({ error });
    throw error;
  } finally {
    execution.dispose();
  }
  if (!(await workflowStillRunning(workflow.id))) return;
  await completeStep(workflow.id, 1, JSON.stringify({ finishReason: generated.finishReason }));

  await beginStep(workflow.id, 2, ai.provider, ai.model);
  const parsed = parseJobMatch(generated.text);
  const validation = validateJobMatchResult(parsed);
  if (!validation.valid) throw new Error(`invalid_model_output:${validation.error}`);
  const scores = parsed.scores!;
  const { body } = parsed;
  await completeStep(workflow.id, 2, JSON.stringify(scores));

  await beginStep(workflow.id, 3, ai.provider, ai.model);
  const matchedAt = new Date();
  await db.$transaction(async (tx) => {
    await tx.jobAnalysis.upsert({
      where: { workflowId: workflow.id },
      create: {
        workflowId: workflow.id, userId: workflow.userId, jobId: job.id,
        resumeId: resume.id, matchScore: scores.matchScore,
        recommendation: scores.recommendation, body,
        provider: ai.provider, model: ai.model!, promptVersion: workflow.promptVersion,
      },
      update: {
        matchScore: scores.matchScore, recommendation: scores.recommendation,
        body, provider: ai.provider, model: ai.model!, promptVersion: workflow.promptVersion,
      },
    });
    await tx.job.update({
      where: { id: job.id, userId: workflow.userId },
      data: {
        matchScore: scores.matchScore,
        matchData: JSON.stringify({ ...scores, body, resumeId: resume.id, resumeTitle: resume.title, matchedAt: matchedAt.toISOString(), provider: ai.provider, model: ai.model, surface: "workflow-v2", workflowId: workflow.id }),
      },
    });
    await tx.agentStep.update({
      where: { workflowId_position: { workflowId: workflow.id, position: 3 } },
      data: { status: "COMPLETED", completedAt: matchedAt, output: JSON.stringify({ analysisSaved: true }) },
    });
    await tx.agentWorkflow.update({
      where: { id: workflow.id },
      data: { status: "COMPLETED", completedAt: matchedAt, lockedAt: null, lockedBy: null, errorCode: null },
    });
    await tx.agentAuditEvent.create({
      data: {
        workflowId: workflow.id,
        action: "analysis.completed",
        actorType: "system",
        metadata: JSON.stringify({ provider: ai.provider, model: ai.model, promptVersion: workflow.promptVersion, matchScore: scores.matchScore }),
      },
    });
  });
}

async function executeCoverLetter(workflow: ClaimedWorkflow) {
  if (!workflow.jobId || !workflow.resumeId) throw new Error("workflow_subject_missing");
  await beginStep(workflow.id, 0);
  const [job, resume, ai] = await Promise.all([
    db.job.findFirst({ where: { id: workflow.jobId, userId: workflow.userId }, include: { JobTitle: true, Company: true, Location: true } }),
    db.resume.findFirst({ where: { id: workflow.resumeId, profile: { userId: workflow.userId } }, include: resumeDetailInclude }),
    getUserAiSettings(workflow.userId),
  ]);
  if (!job || !resume) throw new Error("workflow_subject_missing");
  if (!ai.model) throw new Error("model_not_configured");
  const [resumePre, jobPre] = await Promise.all([preprocessResume(resume as unknown as Resume), preprocessJob(job as unknown as JobResponse)]);
  if (!resumePre.success) throw new Error(`resume_${resumePre.error.code.toLowerCase()}`);
  if (!jobPre.success) throw new Error(`job_${jobPre.error.code.toLowerCase()}`);
  await completeStep(workflow.id, 0, JSON.stringify({ resumeChars: resumePre.data.normalizedText.length, jobChars: jobPre.data.normalizedText.length }));
  if (!(await workflowStillRunning(workflow.id))) return;

  await beginStep(workflow.id, 1, ai.provider, ai.model);
  const model = await getModel(ai.provider, ai.model, workflow.userId);
  const execution = monitorWorkflowExecution(workflow.id, APP_CONSTANTS.AI_COVER_LETTER_TIMEOUT_MS);
  const tracker = startAiCall({ userId: workflow.userId, feature: "cover_letter", provider: ai.provider, model: ai.model });
  let generated;
  try {
    generated = await generateText({
      model,
      system: COVER_LETTER_SYSTEM_PROMPT,
      prompt: buildCoverLetterPrompt(resumePre.data.normalizedText, jobPre.data.normalizedText, extractMatchGuidance(job.matchData)),
      temperature: TEMPERATURES.FEEDBACK,
      abortSignal: execution.signal,
    });
    void tracker.finish({ usage: generated.totalUsage, finishReason: generated.finishReason });
  } catch (error) {
    void tracker.finish({ error });
    throw error;
  } finally {
    execution.dispose();
  }
  if (!(await workflowStillRunning(workflow.id))) return;
  const draft = stripThinking(generated.text).trim();
  await completeStep(workflow.id, 1, JSON.stringify({ finishReason: generated.finishReason, chars: draft.length }));

  await beginStep(workflow.id, 2, ai.provider, ai.model);
  if (draft.length < 200 || !/^Dear\s+/i.test(draft) || /\[[^\]]+\]/.test(draft)) throw new Error("invalid_model_output:invalid_cover_letter");
  await completeStep(workflow.id, 2, JSON.stringify({ valid: true }));
  await beginStep(workflow.id, 3, ai.provider, ai.model);
  await db.agentWorkflow.update({
    where: { id: workflow.id },
    data: { status: "WAITING_APPROVAL", output: draft, lockedAt: null, lockedBy: null, errorCode: null },
  });
  await db.agentAuditEvent.create({
    data: {
      workflowId: workflow.id,
      action: "draft.ready_for_approval",
      actorType: "system",
      metadata: JSON.stringify({ provider: ai.provider, model: ai.model, promptVersion: workflow.promptVersion, characters: draft.length }),
    },
  });
}

async function executeResumeTailor(workflow: ClaimedWorkflow) {
  if (!workflow.jobId || !workflow.resumeId) throw new Error("workflow_subject_missing");
  await beginStep(workflow.id, 0);
  const [job, resume, ai] = await Promise.all([
    db.job.findFirst({ where: { id: workflow.jobId, userId: workflow.userId }, include: { JobTitle: true, Company: true, Location: true } }),
    db.resume.findFirst({ where: { id: workflow.resumeId, profile: { userId: workflow.userId } }, include: resumeDetailInclude }),
    getUserAiSettings(workflow.userId),
  ]);
  if (!job || !resume) throw new Error("workflow_subject_missing");
  if (!ai.model) throw new Error("model_not_configured");
  const [resumePre, jobPre] = await Promise.all([preprocessResume(resume as unknown as Resume), preprocessJob(job as unknown as JobResponse)]);
  if (!resumePre.success) throw new Error(`resume_${resumePre.error.code.toLowerCase()}`);
  if (!jobPre.success) throw new Error(`job_${jobPre.error.code.toLowerCase()}`);
  await completeStep(workflow.id, 0);
  await beginStep(workflow.id, 1, ai.provider, ai.model);
  const model = await getModel(ai.provider, ai.model, workflow.userId);
  const execution = monitorWorkflowExecution(workflow.id, APP_CONSTANTS.AI_RESUME_REVIEW_TIMEOUT_MS);
  const tracker = startAiCall({ userId: workflow.userId, feature: "resume_tailor", provider: ai.provider, model: ai.model });
  let generated;
  try {
    generated = await generateText({ model, system: RESUME_TAILOR_SYSTEM_PROMPT, prompt: buildResumeTailorPrompt(resumePre.data.normalizedText, jobPre.data.normalizedText), temperature: 0, abortSignal: execution.signal });
    void tracker.finish({ usage: generated.totalUsage, finishReason: generated.finishReason });
  } catch (error) {
    void tracker.finish({ error });
    throw error;
  } finally {
    execution.dispose();
  }
  if (!(await workflowStillRunning(workflow.id))) return;
  await completeStep(workflow.id, 1, JSON.stringify({ finishReason: generated.finishReason }));
  await beginStep(workflow.id, 2, ai.provider, ai.model);
  let raw: unknown;
  try { raw = JSON.parse(stripThinking(generated.text).replace(/^```json\s*|\s*```$/g, "")); }
  catch { throw new Error("invalid_model_output:invalid_json"); }
  const parsed = ResumeTailorOutputSchema.safeParse(raw);
  if (!parsed.success) throw new Error("invalid_model_output:invalid_tailoring_schema");
  const source = resumePre.data.normalizedText.toLocaleLowerCase();
  if (parsed.data.suggestions.some((item) => !source.includes(item.original.toLocaleLowerCase()))) {
    throw new Error("invalid_model_output:ungrounded_resume_quote");
  }
  const output = JSON.stringify(parsed.data);
  await completeStep(workflow.id, 2, JSON.stringify({ suggestions: parsed.data.suggestions.length, grounded: true }));
  await beginStep(workflow.id, 3, ai.provider, ai.model);
  await db.agentWorkflow.update({ where: { id: workflow.id }, data: { status: "WAITING_APPROVAL", output, lockedAt: null, lockedBy: null, errorCode: null } });
  await db.agentAuditEvent.create({ data: { workflowId: workflow.id, action: "resume_suggestions.ready_for_approval", actorType: "system", metadata: JSON.stringify({ provider: ai.provider, model: ai.model, promptVersion: workflow.promptVersion, suggestions: parsed.data.suggestions.length }) } });
}

async function failOrRetry(workflow: ClaimedWorkflow, error: unknown) {
  const message = error instanceof Error ? error.message : "execution_failed";
  const nonRetryable = error instanceof MissingCredentialError || ["model_not_configured", "workflow_subject_missing"].includes(message) || message.startsWith("invalid_model_output") || message.startsWith("resume_") || message.startsWith("job_");
  const terminal = nonRetryable || workflow.attempt >= SCHEDULER_CONSTANTS.REQUEST_MAX_ATTEMPTS;
  await db.$transaction(async (tx) => {
    await tx.agentStep.updateMany({
      where: { workflowId: workflow.id, status: "RUNNING" },
      data: { status: terminal ? "FAILED" : "QUEUED", errorCode: message, completedAt: terminal ? new Date() : null, startedAt: terminal ? undefined : null },
    });
    await tx.agentWorkflow.updateMany({
      where: { id: workflow.id, status: "RUNNING" },
      data: terminal
        ? { status: "FAILED", errorCode: message, completedAt: new Date(), lockedAt: null, lockedBy: null }
        : { status: "QUEUED", errorCode: message, availableAt: new Date(Date.now() + 30_000 * 2 ** (workflow.attempt - 1)), lockedAt: null, lockedBy: null },
    });
    if (terminal) {
      await tx.agentAuditEvent.create({ data: { workflowId: workflow.id, action: "workflow.failed", actorType: "system", metadata: JSON.stringify({ errorCode: message, attempt: workflow.attempt }) } });
    }
  });
}

export async function processNextAgentWorkflow(): Promise<boolean> {
  const workflow = await claimAgentWorkflow();
  if (!workflow) return false;
  try {
    if (workflow.type === "COVER_LETTER") await executeCoverLetter(workflow);
    else if (workflow.type === "RESUME_TAILOR") await executeResumeTailor(workflow);
    else await executeJobMatch(workflow);
  } catch (error) {
    log.error("[AgentWorkflow] Execution failed", { "workflow.id": workflow.id, error: String(error) });
    await failOrRetry(workflow, error);
  }
  return true;
}
