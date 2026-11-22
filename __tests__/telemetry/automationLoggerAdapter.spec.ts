import { vi } from "vitest";

vi.mock("@/lib/telemetry", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { createEvent } = vi.hoisted(() => ({ createEvent: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/db", () => ({
  default: { automationRunEvent: { create: createEvent } },
}));

import { automationLogger } from "@/lib/automation-logger";
import { log } from "@/lib/telemetry";

describe("automation logger telemetry fan-out", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("fans an entry out to telemetry with the automation id as an attribute", () => {
    automationLogger.startRun("a1");
    automationLogger.log("a1", "info", "Found 12 jobs", { jobBoard: "lever" });

    expect(log.info).toHaveBeenCalledWith("Found 12 jobs", {
      "automation.id": "a1",
      jobBoard: "lever",
    });
  });

  it("maps success to info and warning to warn", () => {
    automationLogger.startRun("a2");
    automationLogger.log("a2", "success", "Saved 3 jobs");
    automationLogger.log("a2", "warning", "Ollama slow");
    automationLogger.log("a2", "error", "Scrape failed");

    expect(log.info).toHaveBeenCalledWith("Saved 3 jobs", { "automation.id": "a2" });
    expect(log.warn).toHaveBeenCalledWith("Ollama slow", { "automation.id": "a2" });
    expect(log.error).toHaveBeenCalledWith("Scrape failed", { "automation.id": "a2" });
  });

  it("still keeps the entry in the in-memory store", () => {
    automationLogger.startRun("a3");
    automationLogger.log("a3", "info", "kept");
    expect(automationLogger.getLogs("a3").map((l) => l.message)).toContain("kept");
  });

  it("persists ordered events when a run id is available", async () => {
    automationLogger.startRun("a4", "run-4");
    automationLogger.log("a4", "success", "Saved", { count: 2 });
    await automationLogger.flushRun("run-4");

    expect(createEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        runId: "run-4",
        sequence: 1,
        level: "success",
        message: "Saved",
        metadata: JSON.stringify({ count: 2 }),
      }),
    });
  });
});
