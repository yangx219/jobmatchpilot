import type { SourceHealth } from "../ats/types";
import db from "@/lib/db";
import { recordRunNotifications } from "@/lib/notifications/record";
import type { AutomationRunStatus } from "@/models/automation.model";
import { calculateNextRunAt } from "../schedule";
import type { BoardFailure, RunnerResult } from "./types";
import { automationLogger } from "@/lib/automation-logger";

export interface FinalizeData {
  sourceHealth?: SourceHealth[];
  status: AutomationRunStatus;
  errorMessage?: string;
  blockedReason?: string;
  funnelStats?: string;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
  // Forwarded to notifications only; not persisted on AutomationRun.
  boardErrors?: BoardFailure[];
  aiError?: string;
}

export async function finalizeRun(
  runId: string,
  data: FinalizeData,
): Promise<RunnerResult> {
  // Persist the final progress event before the run becomes terminal. The Web
  // process can then close its SSE stream without racing the Worker's writes.
  await automationLogger.flushRun(runId);
  // Before the terminal update: the run watcher refreshes the bell the
  // moment it sees a terminal status.
  await recordRunNotifications(runId, data);
  const { boardErrors: _boardErrors, aiError: _aiError, sourceHealth: _sourceHealth, ...result } = data;
  let funnelStats = data.funnelStats;
  if (data.sourceHealth?.length) {
    let stages: unknown[] = [];
    try { const parsed = JSON.parse(funnelStats ?? "[]"); if (Array.isArray(parsed)) stages = parsed; } catch {}
    funnelStats = JSON.stringify([...stages, ...data.sourceHealth.map((source) => ({ key: `source:${source.id}`, label: source.id, count: source.jobCount, status: source.status, checkedAt: source.checkedAt, message: source.message }))]);
  }
  const run = await db.automationRun.update({
    where: { id: runId },
    data: {
      status: data.status,
      errorMessage: data.errorMessage,
      blockedReason: data.blockedReason,
      funnelStats,
      jobsSearched: data.jobsSearched,
      jobsDeduplicated: data.jobsDeduplicated,
      jobsProcessed: data.jobsProcessed,
      jobsMatched: data.jobsMatched,
      jobsSaved: data.jobsSaved,
      completedAt: new Date(),
    },
  });

  const automation = await db.automation.findUnique({
    where: { id: run.automationId }, select: { scheduleHour: true, sourceConfig: true },
  });
  await db.automation.update({
    where: { id: run.automationId },
    data: {
      lastRunAt: new Date(),
      nextRunAt: calculateNextRunAt(automation?.scheduleHour ?? 8, automation?.sourceConfig),
    },
  });

  return {
    runId: run.id,
    ...result,
  };
}
