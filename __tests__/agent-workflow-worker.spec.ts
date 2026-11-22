const { db, generateText, getUserAiSettings, getModel, preprocessResume, preprocessJob } = vi.hoisted(() => {
  const db: any = {
    $queryRaw: vi.fn(),
    agentWorkflow: { count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    agentStep: { update: vi.fn(), updateMany: vi.fn() },
    job: { findFirst: vi.fn(), update: vi.fn() },
    resume: { findFirst: vi.fn() },
    jobAnalysis: { upsert: vi.fn() },
    agentAuditEvent: { create: vi.fn() },
  };
  db.$transaction = vi.fn(async (callback: any) => callback(db));
  return {
    db,
    generateText: vi.fn(),
    getUserAiSettings: vi.fn(),
    getModel: vi.fn(),
    preprocessResume: vi.fn(),
    preprocessJob: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ default: db }));
vi.mock("ai", () => ({ generateText }));
vi.mock("@/lib/scraper", () => ({ getUserAiSettings }));
vi.mock("@/lib/ai/providers", () => ({ getModel }));
vi.mock("@/lib/ai/tools/preprocessing", () => ({ preprocessResume }));
vi.mock("@/lib/ai/tools/preprocessing-job", () => ({ preprocessJob }));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));
vi.mock("@/lib/aiUsage/tracker", () => ({
  startAiCall: () => ({ finish: vi.fn().mockResolvedValue(undefined) }),
}));

import { claimAgentWorkflow, processNextAgentWorkflow } from "@/lib/workflows/worker";

const workflow = {
  id: "workflow-1",
  userId: "user-1",
  jobId: "job-1",
  resumeId: "resume-1",
  promptVersion: "job-match-v1",
  attempt: 1,
};

describe("agent workflow worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.agentStep.update.mockResolvedValue({});
    db.agentStep.updateMany.mockResolvedValue({ count: 1 });
    db.agentWorkflow.updateMany.mockResolvedValue({ count: 1 });
    db.agentWorkflow.count.mockResolvedValue(1);
  });

  it("atomically claims one queued workflow", async () => {
    db.$queryRaw.mockResolvedValue([workflow]);
    await expect(claimAgentWorkflow()).resolves.toEqual(workflow);
  });

  it("does not silently choose a model when none is configured", async () => {
    db.$queryRaw.mockResolvedValue([workflow]);
    db.job.findFirst.mockResolvedValue({ id: "job-1" });
    db.resume.findFirst.mockResolvedValue({ id: "resume-1" });
    getUserAiSettings.mockResolvedValue({ provider: "openai", model: undefined });

    await expect(processNextAgentWorkflow()).resolves.toBe(true);

    expect(getModel).not.toHaveBeenCalled();
    expect(db.agentWorkflow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", errorCode: "model_not_configured" }),
      }),
    );
  });

  it("persists a validated match and completes all workflow state", async () => {
    db.$queryRaw.mockResolvedValue([workflow]);
    db.job.findFirst.mockResolvedValue({
      id: "job-1", description: "x".repeat(300), matchData: null,
      JobTitle: { label: "AI Engineer" }, Company: { label: "Acme" }, Location: { label: "Paris" },
    });
    db.resume.findFirst.mockResolvedValue({ id: "resume-1", title: "AI CV" });
    getUserAiSettings.mockResolvedValue({ provider: "openai", model: "gpt-test" });
    preprocessResume.mockResolvedValue({ success: true, data: { normalizedText: "resume text", metadata: {}, isValid: true } });
    preprocessJob.mockResolvedValue({ success: true, data: { normalizedText: "job text", metadata: {}, isValid: true } });
    getModel.mockResolvedValue({});
    generateText.mockResolvedValue({
      text: "SCORES: match=82 recommendation=strong\n\n## Summary\nStrong evidence across Java, APIs, databases, and production delivery requirements.",
      finishReason: "stop",
    });

    await processNextAgentWorkflow();

    expect(db.jobAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ matchScore: 82, promptVersion: "job-match-v1" }) }),
    );
    expect(db.agentWorkflow.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED" }) }),
    );
    expect(db.agentAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "analysis.completed", actorType: "system" }) }),
    );
  });

  it("generates a cover-letter draft and waits for explicit approval", async () => {
    db.$queryRaw.mockResolvedValue([{ ...workflow, type: "COVER_LETTER", promptVersion: "cover-letter-v1" }]);
    db.job.findFirst.mockResolvedValue({
      id: "job-1", description: "x".repeat(300), matchData: null,
      JobTitle: { label: "AI Engineer" }, Company: { label: "Acme" }, Location: { label: "Paris" },
    });
    db.resume.findFirst.mockResolvedValue({ id: "resume-1", title: "AI CV" });
    getUserAiSettings.mockResolvedValue({ provider: "openai", model: "gpt-test" });
    preprocessResume.mockResolvedValue({ success: true, data: { normalizedText: "resume text", metadata: {}, isValid: true } });
    preprocessJob.mockResolvedValue({ success: true, data: { normalizedText: "job text", metadata: {}, isValid: true } });
    getModel.mockResolvedValue({});
    const draft = `Dear Hiring Manager,\n\n${"Grounded engineering experience mapped to the role. ".repeat(8)}\n\nSincerely,\nXue Yang`;
    generateText.mockResolvedValue({ text: draft, finishReason: "stop" });

    await processNextAgentWorkflow();

    expect(db.agentWorkflow.update).toHaveBeenLastCalledWith({
      where: { id: "workflow-1" },
      data: expect.objectContaining({ status: "WAITING_APPROVAL", output: draft }),
    });
    expect(db.job.update).not.toHaveBeenCalled();
    expect(db.agentAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "draft.ready_for_approval", actorType: "system" }) }),
    );
  });

  it("does not publish a cover-letter draft cancelled during generation", async () => {
    db.$queryRaw.mockResolvedValue([{ ...workflow, type: "COVER_LETTER", promptVersion: "cover-letter-v1" }]);
    db.job.findFirst.mockResolvedValue({ id: "job-1", matchData: null, JobTitle: {}, Company: {}, Location: {} });
    db.resume.findFirst.mockResolvedValue({ id: "resume-1" });
    getUserAiSettings.mockResolvedValue({ provider: "openai", model: "gpt-test" });
    preprocessResume.mockResolvedValue({ success: true, data: { normalizedText: "resume text" } });
    preprocessJob.mockResolvedValue({ success: true, data: { normalizedText: "job text" } });
    getModel.mockResolvedValue({});
    generateText.mockResolvedValue({ text: `Dear Hiring Manager,\n\n${"Grounded experience. ".repeat(20)}`, finishReason: "stop" });
    db.agentWorkflow.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await processNextAgentWorkflow();

    expect(db.agentWorkflow.update).not.toHaveBeenCalled();
    expect(db.agentAuditEvent.create).not.toHaveBeenCalled();
  });

  it("produces grounded resume-tailoring suggestions without changing the source", async () => {
    db.$queryRaw.mockResolvedValue([{ ...workflow, type: "RESUME_TAILOR", promptVersion: "resume-tailor-v1" }]);
    db.job.findFirst.mockResolvedValue({ id: "job-1", JobTitle: {}, Company: {}, Location: {} });
    db.resume.findFirst.mockResolvedValue({ id: "resume-1", title: "Base CV" });
    getUserAiSettings.mockResolvedValue({ provider: "openai", model: "gpt-test" });
    preprocessResume.mockResolvedValue({ success: true, data: { normalizedText: "Built reliable Java APIs for international sourcing workflows.", metadata: {}, isValid: true } });
    preprocessJob.mockResolvedValue({ success: true, data: { normalizedText: "Seeking Java API engineering experience.", metadata: {}, isValid: true } });
    getModel.mockResolvedValue({});
    generateText.mockResolvedValue({
      text: JSON.stringify({
        summary: "Prioritise the candidate's directly relevant Java API delivery evidence.",
        suggestions: [{
          section: "Experience",
          original: "Built reliable Java APIs for international sourcing workflows.",
          proposed: "Built reliable Java APIs supporting international sourcing workflows.",
          rationale: "Makes the requested Java API experience immediately visible.",
          keywords: ["Java", "API"],
        }],
      }),
      finishReason: "stop",
    });

    await processNextAgentWorkflow();

    expect(db.agentWorkflow.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "WAITING_APPROVAL" }),
    }));
    expect(db.agentAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "resume_suggestions.ready_for_approval" }),
    }));
    expect(db.resume.update).toBeUndefined();
  });

  it("does not publish resume suggestions cancelled during generation", async () => {
    db.$queryRaw.mockResolvedValue([{ ...workflow, type: "RESUME_TAILOR", promptVersion: "resume-tailor-v1" }]);
    db.job.findFirst.mockResolvedValue({ id: "job-1", JobTitle: {}, Company: {}, Location: {} });
    db.resume.findFirst.mockResolvedValue({ id: "resume-1" });
    getUserAiSettings.mockResolvedValue({ provider: "openai", model: "gpt-test" });
    preprocessResume.mockResolvedValue({ success: true, data: { normalizedText: "Built reliable Java APIs." } });
    preprocessJob.mockResolvedValue({ success: true, data: { normalizedText: "Java API role." } });
    getModel.mockResolvedValue({});
    generateText.mockResolvedValue({ text: JSON.stringify({ summary: "Relevant", suggestions: [] }), finishReason: "stop" });
    db.agentWorkflow.count.mockResolvedValueOnce(0);

    await processNextAgentWorkflow();

    expect(db.agentWorkflow.update).not.toHaveBeenCalled();
    expect(db.agentAuditEvent.create).not.toHaveBeenCalled();
  });
});
