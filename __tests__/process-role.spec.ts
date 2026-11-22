import { processRole, shouldRunScheduler } from "@/lib/runtime/processRole";

describe("production process roles", () => {
  it("keeps local development self-contained by default", () => {
    expect(processRole("")).toBe("all");
    expect(shouldRunScheduler("")).toBe(true);
  });

  it("runs the scheduler only outside web replicas", () => {
    expect(shouldRunScheduler("web")).toBe(false);
    expect(shouldRunScheduler("worker")).toBe(true);
    expect(shouldRunScheduler("all")).toBe(true);
  });

  it("fails fast on a misspelled production role", () => {
    expect(() => processRole("wroker")).toThrow("Invalid JOBMATCHPILOT_PROCESS_ROLE");
  });
});
