import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
const mock = vi.hoisted(() => ({ spawn: vi.fn(), exists: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mock.spawn, default: { spawn: mock.spawn } }));
vi.mock("node:fs", () => ({ existsSync: mock.exists, default: { existsSync: mock.exists } }));
import { searchJobSpy } from "@/lib/scraper/jobspy";
const cfg = { sites: ["linkedin", "hellowork"], searchTerms: ["Java junior"], keywords: ["Java"], apiKey: "must-not-be-forwarded" };
const context = { sourceConfig: JSON.stringify({ jobspy: cfg }) };
let child: any;
beforeEach(() => {
 vi.clearAllMocks(); mock.exists.mockReturnValue(true);
 child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = vi.fn();
 mock.spawn.mockReturnValue(child);
});
afterEach(() => vi.useRealTimers());
it("passes only validated search configuration and a restricted environment to Python", async () => {
 let input = ""; child.stdin.on("data", (chunk: Buffer) => { input += chunk; });
 const promise = searchJobSpy([], context);
 child.stdout.write(JSON.stringify({ jobs: [{ title: "Java Junior", company: "Example", location: "Paris", description: "", url: "https://www.linkedin.com/jobs/view/123", sourceBoard: "linkedin" }], errors: [], sourceHealth: [{ id: "linkedin", status: "ok", jobCount: 1, checkedAt: "2026-10-31T15:00:00Z" }] }));
 child.emit("close", 0);
 expect((await promise).jobs[0].sourceBoard).toBe("linkedin");
 expect(input).not.toContain("must-not-be-forwarded");
 const options = mock.spawn.mock.calls[0][2];
 expect(options.env).not.toHaveProperty("DATABASE_URL");
 expect(options.env).not.toHaveProperty("AUTH_SECRET");
 expect(options.shell).toBeUndefined();
});
it("reports missing runtime instead of claiming a successful empty search", async () => {
 mock.exists.mockReturnValue(false);
 const result = await searchJobSpy([], context);
 expect(result.jobs).toEqual([]);
 expect(result.errors).toEqual(cfg.sites.map((token) => ({ token, reason: "collector_not_installed" })));
 expect(mock.spawn).not.toHaveBeenCalled();
});
it("bounds collection time and terminates the child", async () => {
 vi.useFakeTimers(); const promise = searchJobSpy([], context);
 await vi.advanceTimersByTimeAsync(150_000);
 expect(child.kill).toHaveBeenCalledWith("SIGKILL");
 expect((await promise).errors[0].reason).toBe("collector_timeout");
});
it("rejects malformed output and preserves source failure state", async () => {
 const promise = searchJobSpy([], context); child.stdout.write("not JSON"); child.emit("close", 0);
 expect((await promise).errors[0].reason).toBe("collector_invalid_response");
});
it("cancels an in-flight child process", async () => {
 const controller = new AbortController();
 const promise = searchJobSpy([], { ...context, signal: controller.signal });
 controller.abort();
 expect((await promise).errors[0].reason).toBe("cancelled");
 expect(child.kill).toHaveBeenCalledWith("SIGKILL");
});
