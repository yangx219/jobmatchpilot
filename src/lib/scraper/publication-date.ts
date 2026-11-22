import type { JobDetails } from "./types";
// Only source-provided ISO dates. Never fall back to fetched/updated/createdAt.
export function sourcePublication(job: Pick<JobDetails, "postedDate" | "postedDatePrecision" | "postedDateKind">) {
  const raw = job.postedDate?.trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2})/.test(raw)) return null;
  const day = raw.slice(0, 10);
  const midnight = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== day) return null;
  const precision = raw.length === 10 ? "day" : job.postedDatePrecision ?? "timestamp";
  const publishedAt = precision === "day" ? midnight : new Date(raw);
  if (!Number.isFinite(publishedAt.getTime()) || publishedAt.getTime() > Date.now() + 48 * 3_600_000) return null;
  return { publishedAt, publicationPrecision: precision, publicationKind: job.postedDateKind ?? "posted" };
}

