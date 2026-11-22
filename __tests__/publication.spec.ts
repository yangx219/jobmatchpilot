import { sourcePublication, syncPublicationDates } from "@/lib/scraper/publication";
import { publicationFromJsonLd, allowedPublicationUrl } from "@/lib/scraper/publication-enrichment";
import db from "@/lib/db";
vi.mock("@/lib/db", () => ({ default: { job: { findMany: vi.fn(), update: vi.fn() } } }));
const m = db as any;
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-31T16:00:00Z")); });
afterEach(() => vi.useRealTimers());
it("keeps source date-only precision without fabricating a posting hour", () => {
 const date = sourcePublication({ postedDate: "2026-10-25T00:00:00.000", postedDatePrecision: "day", postedDateKind: "platform" });
 expect(date).toEqual({ publishedAt: new Date("2026-10-25T00:00:00.000Z"), publicationPrecision: "day", publicationKind: "platform" });
 expect(sourcePublication({ postedDate: "2026-10-25", postedDatePrecision: "timestamp" })?.publicationPrecision).toBe("day");
});
it("preserves actual source timestamps and last-published semantics", () => {
 const value = sourcePublication({ postedDate: "2026-10-30T09:12:34+01:00", postedDateKind: "last" });
 expect(value?.publishedAt.toISOString()).toBe("2026-10-30T08:12:34.000Z");
 expect(value?.publicationKind).toBe("last");
});
it("never falls back to collection time and rejects invalid, relative or impossible dates", () => {
 for (const raw of [undefined, "", "3 days ago", "2026-02-30", "not a date", "2030-01-01"]) expect(sourcePublication({ postedDate: raw })).toBeNull();
});
it("reads datePosted from the matching JobPosting, ignoring modified dates and unrelated records", () => {
 const html = `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "Article", datePosted: "2026-10-31" }, { "@type": "JobPosting", url: "https://jobs.lever.co/demo/123", datePosted: "2026-10-23", dateModified: "2026-10-31" }] })}</script>`;
 expect(publicationFromJsonLd(html, "https://jobs.lever.co/demo/123")?.publishedAt.toISOString()).toBe("2026-10-23T00:00:00.000Z");
 expect(publicationFromJsonLd(html, "https://jobs.lever.co/demo/other")).toBeNull();
 expect(publicationFromJsonLd('<script type="application/ld+json">{"@type":"JobPosting","dateModified":"2026-10-31"}</script>', "https://jobs.lever.co/demo/1")).toBeNull();
});
it("limits original-page fetching to HTTPS platform hosts without credentials or custom ports", () => {
 expect(allowedPublicationUrl("https://www.hellowork.com/fr-fr/emplois/123.html")).not.toBeNull();
 for (const url of ["http://localhost/", "https://127.0.0.1/", "https://www.hellowork.com.evil.example/", "https://u:p@jobs.lever.co/demo/1", "https://jobs.lever.co:8443/demo/1"]) expect(allowedPublicationUrl(url)).toBeNull();
});
it("backfills only the owner's matched existing URL and leaves application/stage fields untouched", async () => {
 m.job.findMany.mockResolvedValue([{ id: "existing", jobUrl: "https://example.com/job", publishedAt: null, publicationPrecision: null, publicationKind: null }]);
 const jobs = [{ title: "Java", company: "Example", location: "Paris", description: "", url: "https://example.com/job", postedDate: "2026-10-23", postedDateKind: "first" as const }];
 expect(await syncPublicationDates("owner", jobs)).toBe(1);
 expect(m.job.findMany.mock.calls[0][0].where).toMatchObject({ userId: "owner", automationId: { not: null } });
 expect(m.job.update).toHaveBeenCalledWith({ where: { id: "existing", userId: "owner" }, data: { publishedAt: new Date("2026-10-23T00:00:00Z"), publicationPrecision: "day", publicationKind: "first" } });
});
