import type { ScraperResult } from "./types";
// One delayed retry for transient transport/5xx failures. Never retry access
// denial, missing boards or rate limits in a loop.
export async function retryTransient<T>(fetchOnce: () => Promise<ScraperResult<T>>): Promise<ScraperResult<T>> {
  const result = await fetchOnce();
  if (result.success || result.error.type !== "network") return result;
  const reason = result.error.message.toLowerCase();
  if (!/timed out|timeout|fetch failed|connection reset|returned 50[0234]\b/.test(reason)) return result;
  await new Promise((resolve) => setTimeout(resolve, 750));
  return fetchOnce();
}
