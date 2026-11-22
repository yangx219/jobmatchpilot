import { getDiscoveryListings, getDiscoveryWatches, trackDiscoveryJob } from "@/actions/discovery.actions";
import db from "@/lib/db";
import { requireUser } from "@/actions/shared";
import { appendStatusStage } from "@/actions/job/shared";

vi.mock("@/lib/db", () => ({ default: { job: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn() }, jobTitle: { findMany: vi.fn() }, automation: { findMany: vi.fn() }, jobStatus: { findUnique: vi.fn() }, $transaction: vi.fn() } }));
vi.mock("@/actions/shared", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/actions/job/shared", () => ({ appendStatusStage: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({ resolveStageTypeForStatusId: vi.fn().mockResolvedValue("stage-type") }));
const id = "11111111-1111-4111-8111-111111111111";
const mocks = db as any;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "owner" } as any);
  mocks.job.findMany.mockResolvedValue([]); mocks.job.count.mockResolvedValue(0); mocks.jobTitle.findMany.mockResolvedValue([]);
  mocks.job.findFirst.mockResolvedValue({ id, applied: false, appliedDate: null });
  mocks.jobStatus.findUnique.mockResolvedValue({ id: "applied-status", value: "applied" });
  mocks.$transaction.mockImplementation((fn: any) => fn(mocks));
});
it("scopes every listing query and role facet to the signed-in user", async () => {
  await getDiscoveryListings({ search: "Java", role: id, page: 2 });
  const query = mocks.job.findMany.mock.calls[0][0];
  expect(query.where).toMatchObject({ userId: "owner", automationId: { not: null }, discoveryStatus: "new", jobTitleId: id });
  expect(query.skip).toBe(24);
  expect(query.where.OR[0]).toEqual({ JobTitle: { label: { contains: "Java", mode: "insensitive" } } });
  for (const [arg] of mocks.job.count.mock.calls) expect(arg.where.userId).toBe("owner");
  expect(mocks.jobTitle.findMany.mock.calls[0][0].where).toMatchObject({ createdBy: "owner", jobs: { some: { userId: "owner" } } });
});
it("does not query jobs without authentication", async () => {
  vi.mocked(requireUser).mockRejectedValueOnce(new Error("Not authenticated"));
  await expect(getDiscoveryListings()).rejects.toThrow("Not authenticated");
  expect(mocks.job.findMany).not.toHaveBeenCalled();
});
it("rejects invalid pagination", async () => {
  await expect(getDiscoveryListings({ page: -1 })).rejects.toThrow();
  expect(mocks.job.findMany).not.toHaveBeenCalled();
});
it("does not update another user's job", async () => {
  mocks.job.findFirst.mockResolvedValue(null);
  expect(await trackDiscoveryJob(id, "applied")).toMatchObject({ success: false });
  expect(mocks.job.findFirst).toHaveBeenCalledWith({ where: { id, userId: "owner", automationId: { not: null } }, select: { id: true } });
  expect(mocks.$transaction).not.toHaveBeenCalled();
});
it("saving accepts the existing row without recording an application", async () => {
  expect(await trackDiscoveryJob(id, "save")).toMatchObject({ success: true, id });
  expect(mocks.job.update).toHaveBeenCalledWith({ where: { id, userId: "owner" }, data: { discoveryStatus: "bookmarked" } });
  expect(appendStatusStage).not.toHaveBeenCalled();
  expect(mocks.jobStatus.findUnique).not.toHaveBeenCalled();
});
it("removes a bookmark without adding the job to application tracking", async () => {
  expect(await trackDiscoveryJob(id, "unsave")).toMatchObject({ success: true, id });
  expect(mocks.job.update).toHaveBeenCalledWith({ where: { id, userId: "owner" }, data: { discoveryStatus: "new" } });
  expect(appendStatusStage).not.toHaveBeenCalled();
});
it("records applied status, date and timeline inside a serializable transaction", async () => {
  expect(await trackDiscoveryJob(id, "applied")).toMatchObject({ success: true });
  expect(appendStatusStage).toHaveBeenCalledWith(mocks, id, "applied-status", "stage-type", "owner");
  expect(mocks.job.update).toHaveBeenCalledWith({ where: { id, userId: "owner" }, data: { discoveryStatus: "accepted", applied: true, appliedDate: expect.any(Date), statusId: "applied-status" } });
  expect(mocks.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
});
it("does not downgrade an already applied/interviewing job on a repeated click", async () => {
  mocks.job.findFirst.mockResolvedValue({ id, applied: true, statusId: "interview", appliedDate: new Date("2026-01-01") });
  await trackDiscoveryJob(id, "applied");
  expect(appendStatusStage).not.toHaveBeenCalled();
  expect(mocks.job.update.mock.calls[0][0].data).toEqual({ discoveryStatus: "accepted" });
});
it("retries transaction conflicts and reports failures without claiming success", async () => {
  mocks.$transaction.mockRejectedValueOnce({ code: "P2034" }).mockImplementationOnce((fn: any) => fn(mocks));
  expect(await trackDiscoveryJob(id, "applied")).toMatchObject({ success: true });
  expect(mocks.$transaction).toHaveBeenCalledTimes(2);
  mocks.$transaction.mockRejectedValueOnce(new Error("database unavailable"));
  expect(await trackDiscoveryJob(id, "save")).toMatchObject({ success: false });
});
it("returns per-task frequency without exposing source configuration", async () => {
  mocks.automation.findMany.mockResolvedValue([{ id, sourceConfig: JSON.stringify({ lever: { intervalHours: 1 } }), runs: [] }]);
  const tasks = await getDiscoveryWatches();
  expect(tasks[0]).toMatchObject({ intervalHours: 1 });
  expect(tasks[0]).not.toHaveProperty("sourceConfig");
  expect(mocks.automation.findMany.mock.calls[0][0].where.userId).toBe("owner");
});

it("keeps task and platform filters inside the authenticated account scope", async () => {
  await getDiscoveryListings({ task: id, source: "linkedin" });
  expect(mocks.job.findMany.mock.calls[0][0].where).toMatchObject({ userId: "owner", automationId: id, JobSource: { value: "linkedin" } });
});

it("orders by actual source publication with unknown dates last, never ingestion time", async () => {
 await getDiscoveryListings();
 const query = mocks.job.findMany.mock.calls[0][0];
 expect(query.orderBy).toEqual([{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }]);
 expect(query.select.publishedAt).toBe(true);
 expect(JSON.stringify(query.orderBy)).not.toMatch(/createdAt|discoveredAt/);
});

it("filters French contract types from explicit posting text instead of treating all full-time jobs as CDI", async () => {
  await getDiscoveryListings({ contract: "cdi" });
  const where = mocks.job.findMany.mock.calls[0][0].where;
  expect(where.AND[0].OR).toContainEqual({ description: { contains: "CDI", mode: "insensitive" } });
  expect(JSON.stringify(where.AND)).not.toMatch(/jobType/);
});

it("filters recent jobs by source publication time and keeps newest-first ordering", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));
  try {
    await getDiscoveryListings({ contract: "any", ageHours: "6" });
    const query = mocks.job.findMany.mock.calls[0][0];
    expect(query.where.publishedAt.gte).toEqual(new Date("2026-11-01T06:00:00.000Z"));
    expect(query.orderBy).toEqual([{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }]);
  } finally {
    vi.useRealTimers();
  }
});
