const { db, runAutomation, BusyError } = vi.hoisted(() => {
  class HoistedBusyError extends Error {}
  return {
    db: {
      $queryRaw: vi.fn(),
      automationRunRequest: {
        updateMany: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      automation: { findUnique: vi.fn() },
    },
    runAutomation: vi.fn(),
    BusyError: HoistedBusyError,
  };
});

vi.mock("@/lib/db", () => ({ default: db }));
vi.mock("@/lib/scraper", () => ({
  runAutomation,
  AutomationAlreadyRunningError: BusyError,
}));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));

import {
  claimRunRequest,
  processNextRunRequest,
  recoverStaleRunRequests,
} from "@/lib/scheduler/runRequests";

const claimed = { id: "request-1", automationId: "automation-1", attempt: 1 };
const automation = {
  id: "automation-1",
  userId: "user-1",
  name: "AI roles",
  jobBoard: "jobspy",
  keywords: "agent",
  location: "Paris",
  sourceConfig: "{}",
  resumeId: "resume-1",
  resume: { id: "resume-1" },
  matchThreshold: 80,
  scheduleHour: 8,
  nextRunAt: null,
  lastRunAt: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("durable automation run requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.automationRunRequest.updateMany.mockResolvedValue({ count: 1 });
  });

  it("claims at most one queued request", async () => {
    db.$queryRaw.mockResolvedValue([claimed]);
    await expect(claimRunRequest()).resolves.toEqual(claimed);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("returns null when the queue is empty", async () => {
    db.$queryRaw.mockResolvedValue([]);
    await expect(claimRunRequest()).resolves.toBeNull();
  });

  it("recovers processing requests left by a dead worker", async () => {
    const now = new Date("2026-11-01T10:00:00Z");
    await recoverStaleRunRequests(now);
    expect(db.automationRunRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "processing" }),
        data: expect.objectContaining({ status: "queued", errorCode: "worker_interrupted" }),
      }),
    );
  });

  it("executes a claimed request and links its run", async () => {
    db.$queryRaw.mockResolvedValue([claimed]);
    db.automation.findUnique.mockResolvedValue(automation);
    db.automationRunRequest.findFirst.mockResolvedValue({ id: claimed.id });
    runAutomation.mockResolvedValue({ runId: "run-1" });

    await expect(processNextRunRequest()).resolves.toBe(true);
    expect(runAutomation).toHaveBeenCalledWith(expect.objectContaining({ id: automation.id }));
    expect(db.automationRunRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "completed", runId: "run-1" }) }),
    );
  });

  it("fails safely when the automation disappeared", async () => {
    db.$queryRaw.mockResolvedValue([claimed]);
    db.automation.findUnique.mockResolvedValue(null);

    await processNextRunRequest();
    expect(db.automationRunRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed", errorCode: "automation_missing" }) }),
    );
    expect(runAutomation).not.toHaveBeenCalled();
  });
});
