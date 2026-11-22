const { db } = vi.hoisted(() => ({
  db: {
    agentWorkflow: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
    job: { findFirst: vi.fn() },
    resume: { findFirst: vi.fn() },
    userSettings: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ default: db }));

import {
  createAgentWorkflow,
  WorkflowResourceNotFoundError,
} from "@/lib/workflows/service";

const input = {
  type: "job_match" as const,
  jobId: "11111111-1111-4111-8111-111111111111",
  resumeId: "22222222-2222-4222-8222-222222222222",
};

describe("agent workflow service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an existing workflow for the same idempotency key", async () => {
    db.agentWorkflow.findFirst.mockResolvedValue({ id: "existing" });
    const result = await createAgentWorkflow("user-1", input, "request-key-1");
    expect(result).toEqual({ workflow: { id: "existing" }, created: false });
    expect(db.agentWorkflow.create).not.toHaveBeenCalled();
  });

  it("checks ownership and creates a versioned four-step workflow", async () => {
    db.agentWorkflow.count.mockResolvedValue(0);
    db.agentWorkflow.findFirst.mockResolvedValue(null);
    db.job.findFirst.mockResolvedValue({ id: input.jobId, description: "Build agents", jobTitleId: "t1", companyId: "c1", locationId: null, jobType: "CDI", salaryRange: null });
    db.resume.findFirst.mockResolvedValue({ id: input.resumeId, updatedAt: new Date("2026-01-02") });
    db.userSettings.findUnique.mockResolvedValue({ updatedAt: new Date("2026-01-03") });
    db.agentWorkflow.create.mockResolvedValue({ id: "workflow-1" });

    const result = await createAgentWorkflow("user-1", input, null);

    expect(result.created).toBe(true);
    expect(db.job.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: input.jobId, userId: "user-1" } }),
    );
    expect(db.agentWorkflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptVersion: "job-match-v1",
          steps: {
            create: [
              { name: "prepare_context", position: 0 },
              { name: "generate_match", position: 1 },
              { name: "validate_output", position: 2 },
              { name: "persist_analysis", position: 3 },
            ],
          },
        }),
      }),
    );
  });

  it("does not reveal whether a foreign job or resume exists", async () => {
    db.agentWorkflow.count.mockResolvedValue(0);
    db.job.findFirst.mockResolvedValue(null);
    db.resume.findFirst.mockResolvedValue({ id: input.resumeId, updatedAt: new Date("2026-01-02") });
    await expect(createAgentWorkflow("user-1", input, null)).rejects.toBeInstanceOf(
      WorkflowResourceNotFoundError,
    );
  });

  it("rejects new work when the daily AI budget is exhausted", async () => {
    db.agentWorkflow.findFirst.mockResolvedValue(null);
    db.agentWorkflow.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(0);

    await expect(createAgentWorkflow("user-1", input, null)).rejects.toMatchObject({
      code: "daily_limit",
    });
    expect(db.job.findFirst).not.toHaveBeenCalled();
    expect(db.agentWorkflow.create).not.toHaveBeenCalled();
  });

  it("limits the number of active matches per user", async () => {
    db.agentWorkflow.findFirst.mockResolvedValue(null);
    db.agentWorkflow.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);

    await expect(createAgentWorkflow("user-1", input, null)).rejects.toMatchObject({
      code: "active_limit",
      retryAfterSeconds: 30,
    });
  });

  it("reuses a completed analysis when all versioned inputs are unchanged", async () => {
    const cached = { id: "cached-workflow", status: "COMPLETED" };
    db.agentWorkflow.count.mockResolvedValue(0);
    db.job.findFirst.mockResolvedValue({ id: input.jobId, description: "Build agents", jobTitleId: "t1", companyId: "c1", locationId: null, jobType: "CDI", salaryRange: null });
    db.resume.findFirst.mockResolvedValue({ id: input.resumeId, updatedAt: new Date("2026-01-02") });
    db.userSettings.findUnique.mockResolvedValue({ updatedAt: new Date("2026-01-03") });
    db.agentWorkflow.findFirst.mockResolvedValue(cached);

    await expect(createAgentWorkflow("user-1", input, null)).resolves.toEqual({
      workflow: cached,
      created: false,
    });
    expect(db.agentWorkflow.create).not.toHaveBeenCalled();
  });
});
