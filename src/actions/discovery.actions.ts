"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { requireUser } from "@/actions/shared";
import { revalidatePath } from "next/cache";
import { appendStatusStage } from "@/actions/job/shared";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";
import { jobFieldsForStage } from "@/actions/jobStage/shared";
import { automationIntervalHours } from "@/lib/scraper/schedule";
import { directoryBatch } from "@/lib/scraper/ats/directory";
import { flattenHtml } from "@/lib/scraper/html";

const Filters = z.object({
  search: z.string().trim().max(120).default(""),
  role: z.union([z.string().uuid(), z.literal("")]).default(""),
  task: z.union([z.string().uuid(), z.literal("")]).default(""),
  source: z.enum(["", "linkedin", "indeed", "hellowork", "glassdoor", "greenhouse", "lever", "ashby"]).default(""),
  contract: z.enum(["any", "cdi", "cdd", "alternance", "stage", "freelance"]).default("cdi"),
  ageHours: z.union([z.literal(""), z.literal("1"), z.literal("3"), z.literal("6"), z.literal("12"), z.literal("24"), z.literal("72"), z.literal("168")]).default(""),
  state: z.enum(["new", "bookmarked", "accepted"]).default("new"),
  page: z.number().int().min(1).max(10000).default(1),
});
export type DiscoveryFilters = z.input<typeof Filters>;
const PAGE_SIZE = 24;

function descriptionText(raw: string) {
  try { return flattenHtml(raw); } catch { return raw.replace(/<[^>]*>/g, " "); }
}

export async function getDiscoveryWatches() {
  const user = await requireUser();
  const watches = await db.automation.findMany({
    where: { userId: user.id, jobBoard: { in: ["greenhouse", "lever", "ashby", "jobspy"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true, jobBoard: true, sourceConfig: true,
      lastRunAt: true, nextRunAt: true,
      runs: { take: 1, orderBy: { startedAt: "desc" }, select: { id: true, status: true, startedAt: true, completedAt: true, jobsSaved: true, errorMessage: true, funnelStats: true } } },
  });
  return watches.map(({ sourceConfig, ...watch }) => {
    let cfg: Record<string, any> = {};
    try { cfg = JSON.parse(sourceConfig ?? "{}")[watch.jobBoard] ?? {}; } catch {}
    return { ...watch, intervalHours: automationIntervalHours(sourceConfig), searchTerms: Array.isArray(cfg.searchTerms) ? cfg.searchTerms as string[] : [], sites: Array.isArray(cfg.sites) ? cfg.sites as string[] : [], directory: cfg.directoryScope ? (() => { const { companies: _companies, ...summary } = directoryBatch(watch.jobBoard, watch.nextRunAt ?? new Date(), cfg.directoryPinned ? cfg.companies : []); return summary; })() : null,
      runs: watch.runs.map(({ funnelStats, ...run }) => {
        let sources: { id: string; status: string; jobCount: number; checkedAt: string; message?: string }[] = [];
        try { const rows = JSON.parse(funnelStats ?? "[]"); if (Array.isArray(rows)) sources = rows.filter((row) => typeof row?.key === "string" && row.key.startsWith("source:")).map((row) => ({ id: row.key.slice(7), status: String(row.status), jobCount: Number(row.count) || 0, checkedAt: String(row.checkedAt), message: typeof row.message === "string" ? row.message : undefined })); } catch {}
        return { ...run, sources };
      }) };
  });
}

export async function getDiscoveryListings(input: DiscoveryFilters = {}) {
  const user = await requireUser();
  const filters = Filters.parse(input);
  const scope = { userId: user.id, automationId: { not: null } };
  const contractTerms: Record<Exclude<typeof filters.contract, "any">, string[]> = {
    cdi: ["CDI", "contrat à durée indéterminée", "contrat a duree indeterminee", "permanent contract"],
    cdd: ["CDD", "contrat à durée déterminée", "contrat a duree determinee", "fixed-term contract"],
    alternance: ["alternance", "alternant", "apprentissage", "apprenti"],
    stage: ["stage", "stagiaire", "internship", "intern"],
    freelance: ["freelance", "indépendant", "independant", "contractor"],
  };
  const contractFilter: Prisma.JobWhereInput | undefined = filters.contract === "any" ? undefined : {
    OR: contractTerms[filters.contract].flatMap((term) => [
      { description: { contains: term, mode: "insensitive" as const } },
      { JobTitle: { label: { contains: term, mode: "insensitive" as const } } },
    ]),
  };
  const publishedAfter = filters.ageHours
    ? new Date(Date.now() - Number(filters.ageHours) * 60 * 60 * 1000)
    : undefined;
  const where: Prisma.JobWhereInput = {
    ...scope, discoveryStatus: filters.state,
    ...(filters.task ? { automationId: filters.task } : {}),
    ...(filters.source ? { JobSource: { value: filters.source } } : {}),
    ...(filters.role ? { jobTitleId: filters.role } : {}),
    ...(publishedAfter ? { publishedAt: { gte: publishedAfter } } : {}),
    ...(contractFilter ? { AND: [contractFilter] } : {}),
    ...(filters.search ? { OR: [
      { JobTitle: { label: { contains: filters.search, mode: "insensitive" } } },
      { Company: { label: { contains: filters.search, mode: "insensitive" } } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ] } : {}),
  };
  const [jobs, total, roleRows, newCount, bookmarkedCount, trackedCount] = await Promise.all([
    db.job.findMany({
      where, take: PAGE_SIZE, skip: (filters.page - 1) * PAGE_SIZE,
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      select: { id: true, jobTitleId: true, jobUrl: true, description: true, jobType: true, salaryRange: true,
        publishedAt: true, publicationPrecision: true, publicationKind: true, discoveredAt: true, createdAt: true, applied: true, appliedDate: true, discoveryStatus: true,
        JobTitle: { select: { label: true } }, JobSource: { select: { label: true, value: true } }, Company: { select: { label: true } },
        Location: { select: { label: true } }, Status: { select: { value: true } },
        automation: { select: { id: true, name: true, jobBoard: true } } },
    }),
    db.job.count({ where }),
    db.jobTitle.findMany({
      where: { createdBy: user.id, jobs: { some: { ...scope, discoveryStatus: { in: ["new", "bookmarked", "accepted"] } } } },
      select: { id: true, label: true }, orderBy: [{ label: "asc" }, { id: "asc" }],
    }),
    db.job.count({ where: { ...scope, discoveryStatus: "new" } }),
    db.job.count({ where: { ...scope, discoveryStatus: "bookmarked" } }),
    db.job.count({ where: { ...scope, discoveryStatus: "accepted" } }),
  ]);
  return { jobs: jobs.map((job) => ({ ...job, description: descriptionText(job.description) })), total, roles: roleRows, newCount, bookmarkedCount, trackedCount,
    page: filters.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function backfillMissingPublicationDates() {
  const user = await requireUser();
  const { enrichOriginalPublicationDates } = await import("@/lib/scraper/publication-enrichment");
  const { syncPublicationDates } = await import("@/lib/scraper/publication");
  const rows = await db.job.findMany({ where: { userId: user.id, automationId: { not: null }, publishedAt: null, JobSource: { value: { in: ["hellowork", "lever"] } } }, take: 60, select: { jobUrl: true }, orderBy: { id: "asc" } });
  const jobs = rows.filter((row) => row.jobUrl).map((row) => ({ url: row.jobUrl!, title: "", company: "", location: "", description: "" }));
  await enrichOriginalPublicationDates(jobs, 60);
  const updated = await syncPublicationDates(user.id, jobs);
  const unknown = await db.job.count({ where: { userId: user.id, automationId: { not: null }, publishedAt: null } });
  revalidatePath("/dashboard/discover");
  return { updated, unknown };
}

// Reuse the same job row: no duplicate application or overwritten source URL.
// Applied status/date and the status timeline are committed together.
export async function trackDiscoveryJob(id: string, mode: "save" | "unsave" | "applied") {
  const user = await requireUser();
  z.string().uuid().parse(id);
  z.enum(["save", "unsave", "applied"]).parse(mode);
  const owned = await db.job.findFirst({ where: { id, userId: user.id, automationId: { not: null } }, select: { id: true } });
  if (!owned) return { success: false as const, message: "discovery.notFound" };
  try {
    const status = mode === "applied" ? await db.jobStatus.findUnique({ where: { value: "applied" } }) : null;
    if (mode === "applied" && !status) return { success: false as const, message: "discovery.statusMissing" };
    const stageTypeId = status ? await resolveStageTypeForStatusId(status.id, user.id) : null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await db.$transaction(async (tx) => {
          const job = await tx.job.findFirst({ where: { id, userId: user.id, automationId: { not: null } } });
          if (!job) throw new Error("discovery.notFound");
          if (mode === "applied" && !job.applied && status && stageTypeId) {
            await appendStatusStage(tx, id, status.id, stageTypeId, user.id);
            await tx.job.update({ where: { id, userId: user.id }, data: {
              discoveryStatus: "accepted", ...jobFieldsForStage(status.value, status.id, new Date(), job.appliedDate),
            } });
          } else if (mode === "save") {
            await tx.job.update({ where: { id, userId: user.id }, data: { discoveryStatus: "bookmarked" } });
          } else if (mode === "unsave") {
            await tx.job.update({ where: { id, userId: user.id }, data: { discoveryStatus: "new" } });
          } else {
            // A repeated click must never move Interview/Offer back to Applied.
            await tx.job.update({ where: { id, userId: user.id }, data: { discoveryStatus: "accepted" } });
          }
        }, { isolationLevel: "Serializable" });
        break;
      } catch (error) {
        if (attempt < 2 && (error as { code?: string }).code === "P2034") continue;
        throw error;
      }
    }
    for (const path of ["/dashboard/discover", "/dashboard/myjobs", "/dashboard", `/dashboard/myjobs/${id}`]) revalidatePath(path);
    return { success: true as const, id };
  } catch { return { success: false as const, message: "discovery.saveFailed" }; }
}

export type DiscoveryListingData = Awaited<ReturnType<typeof getDiscoveryListings>>;
export type DiscoveryWatch = Awaited<ReturnType<typeof getDiscoveryWatches>>[number];
