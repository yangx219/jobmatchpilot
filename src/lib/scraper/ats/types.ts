import type { JobBoard } from "@/models/automation.model";
import type { JobDetails } from "../types";

// `host` is optional and Lever-only (Greenhouse ignores it); it's persisted
// once a company is resolved so runtime fetches never re-probe regions.
export type AtsHost = "default" | "eu";

export interface SourceHealth {
  id: string; status: "ok" | "empty" | "partial" | "failed"; jobCount: number; checkedAt: string; message?: string;
}

export interface AtsProvider {
  id: JobBoard;
  label: string; // display name shown in the wizard/detail UI
  // Fetch a watchlist with bounded concurrency + per-token isolation.
  search(
    companies: { name: string; token: string; host?: AtsHost }[],
    context?: { sourceConfig?: string | null; signal?: AbortSignal },
  ): Promise<{
    sourceHealth?: SourceHealth[];
    jobs: JobDetails[];
    errors: { token: string; reason: string }[];
  }>;
}
