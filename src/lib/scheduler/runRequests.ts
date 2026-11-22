import db from "@/lib/db";
import { SCHEDULER_CONSTANTS } from "@/lib/constants";
import { AutomationAlreadyRunningError, runAutomation } from "@/lib/scraper";
import type { JobBoard } from "@/models/automation.model";
import { log } from "@/lib/telemetry";
import { randomUUID } from "node:crypto";

type ClaimedRequest = {
  id: string;
  automationId: string;
  attempt: number;
};

const workerId = `${process.pid}-${randomUUID()}`;

export async function recoverStaleRunRequests(now = new Date()) {
  const cutoff = new Date(now.getTime() - SCHEDULER_CONSTANTS.REQUEST_STALE_MS);
  return db.automationRunRequest.updateMany({
    where: { status: "processing", lockedAt: { lt: cutoff } },
    data: {
      status: "queued",
      lockedAt: null,
      lockedBy: null,
      availableAt: now,
      errorCode: "worker_interrupted",
    },
  });
}

export async function claimRunRequest(): Promise<ClaimedRequest | null> {
  const rows = await db.$queryRaw<ClaimedRequest[]>`
    UPDATE "AutomationRunRequest"
    SET "status" = 'processing',
        "attempt" = "attempt" + 1,
        "lockedAt" = NOW(),
        "lockedBy" = ${workerId},
        "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id"
      FROM "AutomationRunRequest"
      WHERE "status" = 'queued' AND "availableAt" <= NOW()
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "automationId", "attempt"
  `;
  return rows[0] ?? null;
}

async function retryOrFail(request: ClaimedRequest, errorCode: string) {
  const terminal = request.attempt >= SCHEDULER_CONSTANTS.REQUEST_MAX_ATTEMPTS;
  const delayMs = 30_000 * 2 ** Math.max(0, request.attempt - 1);
  await db.automationRunRequest.updateMany({
    where: { id: request.id, status: "processing" },
    data: terminal
      ? { status: "failed", errorCode, completedAt: new Date(), lockedAt: null, lockedBy: null }
      : { status: "queued", errorCode, availableAt: new Date(Date.now() + delayMs), lockedAt: null, lockedBy: null },
  });
}

export async function processNextRunRequest(): Promise<boolean> {
  const request = await claimRunRequest();
  if (!request) return false;

  try {
    const automation = await db.automation.findUnique({
      where: { id: request.automationId },
      include: { resume: true },
    });
    if (!automation || !automation.resume) {
      await db.automationRunRequest.update({
        where: { id: request.id },
        data: { status: "failed", errorCode: automation ? "resume_missing" : "automation_missing", completedAt: new Date(), lockedAt: null, lockedBy: null },
      });
      return true;
    }

    const stillProcessing = await db.automationRunRequest.findFirst({
      where: { id: request.id, status: "processing" },
      select: { id: true },
    });
    if (!stillProcessing) return true;

    const result = await runAutomation({
      id: automation.id,
      userId: automation.userId,
      name: automation.name,
      jobBoard: automation.jobBoard as JobBoard,
      keywords: automation.keywords,
      location: automation.location,
      sourceConfig: automation.sourceConfig,
      resumeId: automation.resumeId,
      matchThreshold: automation.matchThreshold,
      scheduleHour: automation.scheduleHour,
      nextRunAt: automation.nextRunAt,
      lastRunAt: automation.lastRunAt,
      status: automation.status as "active" | "paused",
      createdAt: automation.createdAt,
      updatedAt: automation.updatedAt,
    });
    await db.automationRunRequest.updateMany({
      where: { id: request.id, status: "processing" },
      data: { status: "completed", runId: result.runId, completedAt: new Date(), errorCode: null, lockedAt: null, lockedBy: null },
    });
  } catch (error) {
    const code = error instanceof AutomationAlreadyRunningError
      ? "automation_busy"
      : "execution_failed";
    log.error("[RunRequest] Execution failed", {
      "request.id": request.id,
      "automation.id": request.automationId,
      "request.attempt": request.attempt,
      error: error instanceof Error ? error.message : String(error),
    });
    await retryOrFail(request, code);
  }
  return true;
}
