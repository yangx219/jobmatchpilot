import { retryTransient } from "@/lib/scraper/retry";
afterEach(() => vi.useRealTimers());
it("retries a transient timeout once, then returns the second result", async () => {
 vi.useFakeTimers(); const run = vi.fn().mockResolvedValueOnce({ success: false, error: { type: "network", message: "timed out" } }).mockResolvedValueOnce({ success: true, data: ["job"] });
 const promise = retryTransient(run); await vi.advanceTimersByTimeAsync(750);
 expect(await promise).toEqual({ success: true, data: ["job"] }); expect(run).toHaveBeenCalledTimes(2);
});
it("does not keep retrying 403, 404 or rate limits", async () => {
 for (const error of [{ type: "network", message: "Board returned 403" }, { type: "network", message: "Board returned 404" }, { type: "rate_limited" }]) {
  const run = vi.fn().mockResolvedValue({ success: false, error }); await retryTransient(run); expect(run).toHaveBeenCalledTimes(1);
 }
});
it("retains partial successful data and warnings without retrying the whole board", async () => {
 const result = { success: true, data: ["kept"], warnings: [{ type: "rate_limited" }] };
 const run = vi.fn().mockResolvedValue(result); expect(await retryTransient(run)).toBe(result); expect(run).toHaveBeenCalledTimes(1);
});
