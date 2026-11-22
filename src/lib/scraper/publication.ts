import db from "@/lib/db";
import { normalizeJobUrl } from "./utils";
import type { JobDetails } from "./types";

import { sourcePublication } from "./publication-date";
export { sourcePublication } from "./publication-date";

// Runs before dedup, so previously collected rows acquire dates without being
// duplicated or having their application status, stage/date or URL changed.
export async function syncPublicationDates(userId: string, jobs: JobDetails[]) {
  const byUrl = new Map<string, NonNullable<ReturnType<typeof sourcePublication>>>();
  for (const job of jobs) {
    const publication = sourcePublication(job);
    if (publication && job.url) byUrl.set(normalizeJobUrl(job.url), publication);
  }
  if (!byUrl.size) return 0;
  const rows = await db.job.findMany({ where: { userId, automationId: { not: null }, jobUrl: { in: [...byUrl.keys()] } }, select: { id: true, jobUrl: true, publishedAt: true, publicationPrecision: true, publicationKind: true } });
  let updated = 0;
  for (const row of rows) {
    const publication = row.jobUrl ? byUrl.get(row.jobUrl) : null;
    if (!publication || (row.publishedAt?.getTime() === publication.publishedAt.getTime() && row.publicationPrecision === publication.publicationPrecision && row.publicationKind === publication.publicationKind)) continue;
    await db.job.update({ where: { id: row.id, userId }, data: publication });
    updated++;
  }
  return updated;
}
