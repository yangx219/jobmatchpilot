import db from "@/lib/db";
import { getWorkspaceOverview } from "@/lib/workspace";

vi.mock("@/lib/db", () => ({ default: {
  job: { count: vi.fn(), findMany: vi.fn() },
  resume: { count: vi.fn() },
  automation: { findMany: vi.fn() },
  userSettings: { findUnique: vi.fn() },
} }));

describe("workspace ownership and configuration", () => {
  beforeEach(() => {
    vi.mocked(db.job.count).mockResolvedValue(0);
    vi.mocked(db.job.findMany).mockResolvedValue([]);
    vi.mocked(db.resume.count).mockResolvedValue(0);
    vi.mocked(db.automation.findMany).mockResolvedValue([]);
    vi.mocked(db.userSettings.findUnique).mockResolvedValue(null);
  });

  it("scopes every read to the caller and includes manually saved jobs with null discovery status", async () => {
    const result = await getWorkspaceOverview("owner-a");
    for (const [query] of vi.mocked(db.job.count).mock.calls) expect(query?.where?.userId).toBe("owner-a");
    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner-a", OR: [{ discoveryStatus: null }, { discoveryStatus: { not: "dismissed" } }] }) }));
    expect(db.automation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner-a" } }));
    expect(db.resume.count).toHaveBeenCalledWith({ where: { profile: { userId: "owner-a" } } });
    expect(db.userSettings.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner-a" } }));
    expect(result.modelSelected).toBe(false);
  });

  it("does not turn a database failure into misleading empty dashboard counts", async () => {
    vi.mocked(db.job.count).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(getWorkspaceOverview("owner-a")).rejects.toThrow("database unavailable");
  });
});
