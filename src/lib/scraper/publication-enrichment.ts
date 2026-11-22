import pLimit from "p-limit";
import { sourcePublication } from "./publication-date";
import type { JobDetails } from "./types";

const allowedHosts = new Set(["www.hellowork.com", "jobs.lever.co", "jobs.eu.lever.co"]);
export function allowedPublicationUrl(raw: string) {
  try { const url = new URL(raw); return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && allowedHosts.has(url.hostname) ? url : null; } catch { return null; }
}

export function publicationFromJsonLd(html: string, sourceUrl: string) {
  const candidates: Record<string, unknown>[] = [];
  function visit(value: unknown, depth = 0) {
    if (depth > 8 || candidates.length > 100 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    const node = value as Record<string, unknown>;
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (types.includes("JobPosting")) candidates.push(node);
    for (const key of ["@graph", "mainEntity", "itemListElement", "item"]) if (node[key]) visit(node[key], depth + 1);
  }
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try { visit(JSON.parse(match[1])); } catch {}
  }
  const canonical = (raw: string) => { try { const url = new URL(raw, sourceUrl); return `${url.origin}${url.pathname.replace(/\/$/, "")}`; } catch { return ""; } };
  const matched = candidates.find((node) => typeof node.url === "string" && canonical(node.url) === canonical(sourceUrl));
  const posting = matched ?? (candidates.length === 1 && !candidates[0].url ? candidates[0] : null);
  if (!posting || typeof posting.datePosted !== "string") return null;
  return sourcePublication({ postedDate: posting.datePosted, postedDateKind: "posted" });
}

async function fetchOriginalPublication(raw: string) {
  const url = allowedPublicationUrl(raw);
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), redirect: "error", headers: { Accept: "text/html" } });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    let bytes = 0, html = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.length; if (bytes > 2_000_000) { await reader.cancel(); return null; }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return publicationFromJsonLd(html, url.href);
  } catch { return null; }
}

// Enrich only eligible, relevant original postings. Other/unknown domains are
// never requested; unknown source dates stay unknown. No updatedAt fallback.
export async function enrichOriginalPublicationDates(jobs: JobDetails[], maxJobs = 40) {
  const candidates = jobs.filter((job) => !sourcePublication(job) && allowedPublicationUrl(job.url)).slice(0, maxJobs);
  const limit = pLimit(3);
  let found = 0;
  await Promise.all(candidates.map((job) => limit(async () => {
    const publication = await fetchOriginalPublication(job.url);
    if (!publication) return;
    job.postedDate = publication.publishedAt.toISOString();
    job.postedDatePrecision = publication.publicationPrecision;
    job.postedDateKind = "posted";
    found++;
  })));
  return found;
}
