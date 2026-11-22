import "server-only";
import db from "@/lib/db";

// The caller supplies the authenticated user ID, never a URL/query parameter.
export async function getWorkspaceOverview(userId: string) {
  const visible = { userId, OR: [{ discoveryStatus: null }, { discoveryStatus: { not: "dismissed" } }] };
  const [jobs, discovered, applied, interviewing, resumes, automations, recentJobs, settings] = await Promise.all([
    db.job.count({ where: visible }),
    db.job.count({ where: { ...visible, discoveryStatus: "new" } }),
    db.job.count({ where: { ...visible, applied: true } }),
    db.job.count({ where: { ...visible, Status: { value: "interview" } } }),
    db.resume.count({ where: { profile: { userId } } }),
    db.automation.findMany({
      where: { userId }, orderBy: { createdAt: "desc" },
      select: { id: true, name: true, jobBoard: true, status: true, nextRunAt: true,
        runs: { take: 1, orderBy: { startedAt: "desc" }, select: { status: true, completedAt: true, jobsSaved: true } } },
    }),
    db.job.findMany({
      where: visible, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 6,
      select: { id: true, createdAt: true, matchData: true, matchScore: true, discoveryStatus: true,
        Company: { select: { label: true } }, JobTitle: { select: { label: true } },
        Location: { select: { label: true } }, Status: { select: { value: true, label: true } } },
    }),
    db.userSettings.findUnique({ where: { userId }, select: { settings: true } }),
  ]);
  let modelSelected = false;
  try { modelSelected = Boolean(JSON.parse(settings?.settings ?? "{}").ai?.model); } catch { /* No valid model selection. */ }
  return { jobs, discovered, applied, interviewing, resumes, automations, recentJobs, modelSelected };
}

export type WorkspaceOverview = Awaited<ReturnType<typeof getWorkspaceOverview>>;
