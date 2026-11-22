import { APP_CONSTANTS } from "@/lib/constants";
import { CreateAutomationSchema, JobSpySourceConfigSchema } from "@/models/automation.schema";
import { parseAtsConfig } from "@/lib/scraper/automation-run/config";
import { runAtsPipeline } from "@/lib/scraper/ats/pipeline";
import { directoryBatch } from "@/lib/scraper/ats/directory";
import { calculateNextRunAt } from "@/lib/scraper/schedule";
const config = { sites: ["linkedin", "indeed", "hellowork"], searchTerms: ["Java junior"], keywords: ["Java", "Spring"], intervalHours: 1 };
it("validates cross-company search without requiring a company list", () => {
 const result = CreateAutomationSchema.safeParse({ name: "My search", jobBoard: "jobspy", sourceConfig: { jobspy: config }, resumeId: "11111111-1111-4111-8111-111111111111", matchThreshold: 80, scheduleHour: 8 });
 expect(result.success).toBe(true);
 expect(CreateAutomationSchema.safeParse({ name: "Missing config", jobBoard: "jobspy", resumeId: "11111111-1111-4111-8111-111111111111", matchThreshold: 80, scheduleHour: 8 }).success).toBe(false);
});
it("bounds platforms, query count and per-query result volume", () => {
 expect(JobSpySourceConfigSchema.safeParse({ ...config, sites: ["arbitrary-host"] }).success).toBe(false);
 expect(JobSpySourceConfigSchema.safeParse({ ...config, searchTerms: ["a", "b", "c", "d"] }).success).toBe(false);
 expect(JobSpySourceConfigSchema.safeParse({ ...config, resultsPerQuery: 10000 }).success).toBe(false);
});
it("adapts platform searches into the shared pipeline and preserves title exclusions", () => {
 const parsed = parseAtsConfig(JSON.stringify({ jobspy: { ...config, excludedTitleTerms: ["Senior"] } }), "jobspy");
 expect(parsed?.companies.map((source) => source.token)).toEqual(config.sites);
 expect(parsed?.excludedTitleTerms).toEqual(["Senior"]);
});
it("filters explicit senior/internship titles without matching substrings", () => {
 const job = { company: "Example", location: "Paris", description: "Java Spring", url: "https://example.com/job" };
 const result = runAtsPipeline(["Senior Java Developer", "Java Developer — Stage", "Junior Java Developer", "Java Developer at Staffbase"].map((title) => ({ ...job, title })), { targetTitles: ["Java Developer"], keywords: ["Java"], locations: [], strictLocation: false, excludedTitleTerms: ["senior", "stage", "staff"] }, []);
 expect([...result.toAnalyze, ...result.toSaveUnanalyzed].map((row) => row.job.title)).toEqual(expect.arrayContaining(["Junior Java Developer", "Java Developer at Staffbase"]));
 expect(result.funnel.relevant).toBe(2);
});
it("rotates bounded ATS directory batches instead of querying a fixed employer list", () => {
 const first = directoryBatch("greenhouse", new Date("2026-10-31T10:00:00Z"));
 const second = directoryBatch("greenhouse", new Date("2026-10-31T11:00:00Z"));
 expect(first.total).toBeGreaterThan(20);
 expect(first.companies.length).toBeLessThanOrEqual(APP_CONSTANTS.ATS_MAX_COMPANIES);
 expect(first.companies).not.toEqual(second.companies);
 const parsed = parseAtsConfig(JSON.stringify({ greenhouse: { companies: [{ name: "pinned", token: "pinned" }], directoryScope: true } }), "greenhouse");
 expect(parsed?.companies).not.toEqual([{ name: "pinned", token: "pinned" }]);
});
it("schedules platform tasks on the next hour", () => {
 const next = calculateNextRunAt(8, { jobspy: config });
 expect(next.getMinutes()).toBe(0);
 expect(next.getTime() - Date.now()).toBeGreaterThan(0);
 expect(next.getTime() - Date.now()).toBeLessThanOrEqual(3_600_000);
});

it("retains preferred employers without leaving holes in the rotating directory", () => {
 const preferred = [{ name: "Datadog", token: "datadog" }];
 const first = directoryBatch("greenhouse", new Date("2026-10-31T10:00:00Z"), preferred);
 expect(first.companies[0]).toEqual(preferred[0]);
 expect(first.companies.length).toBeLessThanOrEqual(APP_CONSTANTS.ATS_MAX_COMPANIES);
 const seen = new Set<string>();
 for (let hour = 0; hour < first.batches; hour++) for (const row of directoryBatch("greenhouse", new Date(hour * 3_600_000), preferred).companies) seen.add(row.token);
 expect(seen.size).toBe(first.total);
});
