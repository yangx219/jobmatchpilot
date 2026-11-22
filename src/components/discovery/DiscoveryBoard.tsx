"use client";

import { QuickSearch } from "./QuickSearch";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, Search, Bookmark, Check, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { backfillMissingPublicationDates, getDiscoveryListings, getDiscoveryWatches, trackDiscoveryJob, type DiscoveryListingData, type DiscoveryWatch, type DiscoveryFilters } from "@/actions/discovery.actions";

export function safeJobUrl(value: string | null) {
  try { const url = new URL(value ?? ""); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export function DiscoveryBoard({ initialData, initialWatches, resumes = [] }: { initialData: DiscoveryListingData; initialWatches: DiscoveryWatch[]; resumes?: { id: string; title: string }[] }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState(initialData);
  const [watches, setWatches] = useState(initialWatches);
  const [watchId, setWatchId] = useState(initialWatches[0]?.id ?? "");
  const [filters, setFilters] = useState<DiscoveryFilters>({ state: "new", contract: "cdi", ageHours: "", page: 1 });
  const filtersRef = useRef(filters);
  const requestId = useRef(0);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [dating, setDating] = useState(false);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [poll, setPoll] = useState<{ id: string; previousId?: string; started: number } | null>(null);
  useEffect(() => { setWatches(initialWatches); }, [initialWatches]);
  async function load(next = filtersRef.current) {
    filtersRef.current = next; setFilters(next); setBusy(true);
    const request = ++requestId.current;
    try {
      let result = await getDiscoveryListings(next);
      const resolved = (next.page ?? 1) > result.pages ? { ...next, page: result.pages } : next;
      if (resolved !== next) result = await getDiscoveryListings(resolved);
      if (request === requestId.current) { filtersRef.current = resolved; setFilters(resolved); setData(result); }
    }
    catch { setNotice("discovery.loadFailed"); }
    finally { if (request === requestId.current) setBusy(false); }
  }
  useEffect(() => {
    if (!poll) return;
    let cancelled = false, fetching = false;
    const tick = async () => {
      if (fetching) return; fetching = true;
      try {
        const next = await getDiscoveryWatches();
        if (cancelled) return;
        setWatches(next);
        const run = next.find((w) => w.id === poll.id)?.runs[0];
        if (run && run.id !== poll.previousId && !["running", "cancelling"].includes(run.status)) {
          setPoll(null); setRunning(false);
          setNotice(run.status === "completed" ? "discovery.finished" : "discovery.checkRun");
          await load();
        } else if (Date.now() - poll.started > 300_000) {
          setPoll(null); setRunning(false); setNotice("discovery.stillRunning");
          await load();
        }
      } catch { if (!cancelled) { setNotice("discovery.loadFailed"); setPoll(null); setRunning(false); } }
      finally { fetching = false; }
    };
    const timer = setInterval(tick, 2500);
    return () => { cancelled = true; clearInterval(timer); };
    // Polling always reloads the current filters through filtersRef.
  }, [poll]);
  async function collect(id = watchId) {
    if (!id || running) return;
    setRunning(true); setNotice("");
    try {
      const previousId = watches.find((w) => w.id === id)?.runs[0]?.id;
      const response = await fetch(`/api/automations/${id}/run`, { method: "POST" });
      if (!response.ok) { setRunning(false); setNotice(response.status === 429 ? "discovery.rateLimit" : response.status === 409 ? "discovery.alreadyRunning" : "discovery.runFailed"); return; }
      setNotice("discovery.started"); setPoll({ id, previousId, started: Date.now() });
    } catch { setRunning(false); setNotice("discovery.runFailed"); }
  }
  async function track(id: string, mode: "save" | "unsave" | "applied") {
    setSaving(id); setNotice("");
    try { const result = await trackDiscoveryJob(id, mode); setNotice(result.success ? mode === "applied" ? "discovery.appliedSaved" : mode === "unsave" ? "discovery.unsaved" : "discovery.saved" : result.message); if (result.success) await load(); }
    catch { setNotice("discovery.saveFailed"); }
    finally { setSaving(null); }
  }
  const date = (value: Date | string | null) => value ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
  const selected = watches.find((w) => w.id === watchId);
  const latestSelectedRunAt = selected?.runs[0]?.startedAt
    ? new Date(selected.runs[0].startedAt).getTime()
    : null;
  const publicationDate = (value: Date, precision: string | null) => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, precision !== "timestamp" ? { dateStyle: "medium", timeZone: "UTC" } : { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const fieldClass = "h-9 min-w-0 rounded-md border border-slate-200 bg-background px-3 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return <div className="col-span-3 space-y-4 min-w-0 py-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <h1 className="text-2xl font-semibold">{t("discovery.title")}</h1>
      <div className="flex gap-2"><Button variant="outline" asChild><Link href="/dashboard/myjobs">{t("discovery.myJobs")}</Link></Button><Button asChild><Link href="/dashboard/automations">{t("discovery.configure")}</Link></Button></div>
    </header>
    <details className="text-sm text-muted-foreground">
      <summary className="w-fit cursor-pointer">{t("coverage.supported")}</summary>
      <div className="mt-2 flex flex-wrap gap-3 text-xs"><a className="text-blue-600 underline" href="https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=developpeur%20java" target="_blank" rel="noopener noreferrer">APEC ↗</a><a className="text-blue-600 underline" href="https://www.welcometothejungle.com/fr/jobs?query=java" target="_blank" rel="noopener noreferrer">Welcome to the Jungle ↗</a></div>
    </details>
    <QuickSearch resumes={resumes} initiallyOpen={!initialWatches.length} onCreated={async (id) => { setWatches(await getDiscoveryWatches()); setWatchId(id); await collect(id); }} />
    <section className="rounded-lg border bg-card p-3 space-y-3" aria-label={t("discovery.collect")}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-52 flex-1"><span className="sr-only">{t("discovery.watch")}</span><select className={`${fieldClass} w-full`} value={watchId} onChange={(e) => setWatchId(e.target.value)} disabled={running || !watches.length}>{!watches.length && <option value="">{t("discovery.noWatches")}</option>}{watches.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <Button onClick={() => collect()} disabled={running || !watchId}><RefreshCw className={`size-4 ${running ? "animate-spin" : ""}`} />{t(running ? "discovery.running" : "discovery.collect")}</Button>
        <Button size="icon" variant="outline" title={t("discovery.refresh")} aria-label={t("discovery.refresh")} onClick={() => load()} disabled={busy}><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /></Button>
      </div>
      {selected && <details className="text-xs text-muted-foreground"><summary className="w-fit cursor-pointer">{t("discovery.watchDetails")}</summary><div className="mt-3 space-y-3"><div className="flex flex-wrap gap-x-5 gap-y-1"><span>{t(selected.status === "active" ? selected.intervalHours === 1 ? "discovery.hourly" : "discovery.daily" : "discovery.paused")}</span><span>{t("discovery.next")}: {date(selected.nextRunAt)}</span><span>{t("discovery.last")}: {date(selected.lastRunAt)}</span><Link className="underline" href={`/dashboard/automations/${selected.id}`}>{t("discovery.runHistory")}</Link></div>{!!selected.searchTerms.length && <p>{selected.searchTerms.join(" · ")}</p>}{!!selected.runs[0]?.sources.length && <div className="flex flex-wrap gap-2">{selected.runs[0].sources.map((source) => <span key={source.id} className="rounded-full border px-2 py-1 capitalize">{source.id} · {source.jobCount}</span>)}</div>}<Button size="sm" variant="outline" disabled={dating} onClick={async () => { setDating(true); try { const result = await backfillMissingPublicationDates(); setNotice(t("publication.updated", result)); await load(); } catch { setNotice("discovery.loadFailed"); } finally { setDating(false); } }}>{t(dating ? "publication.updating" : "publication.backfill")}</Button></div></details>}
    </section>
    {notice && <p role="status" className="rounded-md border bg-muted/30 p-3 text-sm">{t(notice)}</p>}
    <section className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1" aria-label={t("discovery.listings")}>
        {(["new", "bookmarked", "accepted"] as const).map((state) => <Button className="h-8 rounded-md px-3 shadow-none" size="sm" key={state} variant={(filters.state ?? "new") === state ? "default" : "ghost"} onClick={() => load({ ...filtersRef.current, state, page: 1 })}>{t(state === "new" ? "discovery.new" : state === "bookmarked" ? "discovery.bookmarked" : "discovery.tracked")} <span className="rounded-full bg-background/80 px-1.5 text-[11px] text-foreground">{state === "new" ? data.newCount : state === "bookmarked" ? data.bookmarkedCount : data.trackedCount}</span></Button>)}
      </div>
      <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); load({ ...filtersRef.current, search, page: 1 }); }}>
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-60 flex-1 gap-2"><input aria-label={t("discovery.search")} placeholder={t("discovery.search")} value={search} maxLength={120} onChange={(e) => setSearch(e.target.value)} className={`${fieldClass} min-w-0 flex-1`} /><Button type="submit" size="icon" variant="outline" aria-label={t("discovery.searchButton")} disabled={busy}><Search className="size-4" /></Button></div>
          <select aria-label={t("career.contracts")} className={`${fieldClass} w-32`} value={filters.contract ?? "cdi"} onChange={(e) => load({ ...filtersRef.current, contract: e.target.value as DiscoveryFilters["contract"], page: 1 })}><option value="cdi">CDI</option><option value="cdd">CDD</option><option value="alternance">Alternance</option><option value="stage">Stage</option><option value="freelance">Freelance</option><option value="any">{t("discovery.allContracts")}</option></select>
          <select aria-label={t("discovery.publishedWithin")} className={`${fieldClass} w-48`} value={filters.ageHours ?? ""} onChange={(e) => load({ ...filtersRef.current, ageHours: e.target.value as DiscoveryFilters["ageHours"], page: 1 })}><option value="">{t("discovery.anyTime")}</option><option value="1">{t("discovery.lastHour")}</option><option value="3">{t("discovery.lastHours", { count: 3 })}</option><option value="6">{t("discovery.lastHours", { count: 6 })}</option><option value="12">{t("discovery.lastHours", { count: 12 })}</option><option value="24">{t("discovery.lastHours", { count: 24 })}</option><option value="72">{t("discovery.lastDays", { count: 3 })}</option><option value="168">{t("discovery.lastDays", { count: 7 })}</option></select>
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground" aria-expanded={showMoreFilters} onClick={() => setShowMoreFilters((value) => !value)}><SlidersHorizontal className="size-4" />{t("discovery.moreFilters")}<ChevronDown className={`size-3 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} /></Button>
        </div>
        {showMoreFilters && (
          <div className="grid gap-2 border-t pt-2 sm:grid-cols-3">
            <select aria-label={t("discovery.role")} className={fieldClass} value={filters.role ?? ""} onChange={(e) => load({ ...filtersRef.current, role: e.target.value, page: 1 })}><option value="">{t("discovery.allRoles")}</option>{data.roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>
            <select aria-label={t("coverage.filterTask")} className={fieldClass} value={filters.task ?? ""} onChange={(e) => load({ ...filtersRef.current, task: e.target.value, role: "", page: 1 })}><option value="">{t("coverage.allTasks")}</option>{watches.map((watch) => <option key={watch.id} value={watch.id}>{watch.name}</option>)}</select>
            <select aria-label={t("coverage.filterSource")} className={fieldClass} value={filters.source ?? ""} onChange={(e) => load({ ...filtersRef.current, source: e.target.value as DiscoveryFilters["source"], page: 1 })}><option value="">{t("coverage.allSources")}</option>{["LinkedIn", "Indeed", "HelloWork", "Glassdoor", "Greenhouse", "Lever", "Ashby"].map((source) => <option key={source} value={source.toLowerCase()}>{source}</option>)}</select>
          </div>
        )}
      </form>
    </section>
    <div aria-busy={busy} className={busy ? "opacity-60 space-y-6" : "space-y-6"}>
      {!data.jobs.length && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("discovery.empty")}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{data.jobs.map((job) => {
        const url = safeJobUrl(job.jobUrl);
        const isLatestPull = latestSelectedRunAt !== null && job.automation?.id === selected?.id && !!job.discoveredAt && new Date(job.discoveredAt).getTime() >= latestSelectedRunAt;
        return <article key={job.id} data-testid="discovery-card" className={`relative min-w-0 rounded-xl border p-4 flex flex-col gap-2.5 transition hover:-translate-y-0.5 hover:shadow-md ${isLatestPull ? "border-blue-300 border-l-4 bg-blue-50/50 shadow-sm" : "bg-card"}`}>
          <div>{isLatestPull && <span className="mb-2 inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">{t("discovery.justPulled")}</span>}<h2 className="font-semibold break-words">{job.JobTitle.label}</h2><p className="text-sm mt-1 break-words">{job.Company.label}</p><p className="text-sm text-muted-foreground break-words">{[job.Location?.label, job.jobType === "FT" ? t("Full-time") : job.jobType].filter(Boolean).join(" · ")}</p></div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded border px-2 py-1">{job.JobSource?.label ?? job.automation?.jobBoard}</span>{job.salaryRange && <span>{job.salaryRange}</span>}{job.applied && <span className="text-blue-600">{t("discovery.applied")}</span>}</div>
          <details className="text-sm"><summary className="cursor-pointer text-blue-600">{t("discovery.description")}</summary><p className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words">{job.description || t("discovery.noDescription")}</p></details>
          <p className="text-xs text-muted-foreground" data-testid="publication-date">{job.publishedAt ? <>{t(job.publicationKind === "last" ? "publication.last" : job.publicationKind === "first" ? "publication.first" : job.publicationKind === "platform" ? "publication.platform" : "publication.date")}: <time dateTime={new Date(job.publishedAt).toISOString()} title={job.publicationPrecision !== "timestamp" ? t("publication.dayOnly") : undefined}>{publicationDate(job.publishedAt, job.publicationPrecision)}</time></> : t("publication.unknown")}</p>
          <div className="mt-auto flex items-center gap-2 border-t pt-3">
            {url && <a className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline" href={url} target="_blank" rel="noopener noreferrer">{t("discovery.original")}<ExternalLink className="size-3.5" /></a>}
            <div className="ml-auto flex items-center gap-2">
              {job.discoveryStatus !== "accepted" && <Button className="h-8 w-8" size="icon" variant={job.discoveryStatus === "bookmarked" ? "secondary" : "ghost"} title={t(job.discoveryStatus === "bookmarked" ? "discovery.unsave" : "discovery.save")} aria-label={t(job.discoveryStatus === "bookmarked" ? "discovery.unsave" : "discovery.save")} disabled={saving !== null} onClick={() => track(job.id, job.discoveryStatus === "bookmarked" ? "unsave" : "save")}><Bookmark className={`size-4 ${job.discoveryStatus === "bookmarked" ? "fill-current text-blue-600" : ""}`} /></Button>}
              {job.discoveryStatus === "accepted" ? <Button className="h-8 px-3" size="sm" variant="outline" asChild><Link href={`/dashboard/myjobs/${job.id}`}>{t("discovery.openTracked")}</Link></Button> : !job.applied && <Button className="h-8 px-3" size="sm" disabled={saving !== null} onClick={() => track(job.id, "applied")}><Check className="size-3.5" />{t("discovery.markApplied")}</Button>}
            </div>
          </div>
        </article>;
      })}</div>
    </div>
    <nav className="flex items-center justify-between gap-2" aria-label={t("discovery.pagination")}><Button variant="outline" disabled={busy || data.page <= 1} onClick={() => load({ ...filtersRef.current, page: data.page - 1 })}>{t("discovery.previous")}</Button><span className="text-sm">{data.page} / {data.pages} · {data.total}</span><Button variant="outline" disabled={busy || data.page >= data.pages} onClick={() => load({ ...filtersRef.current, page: data.page + 1 })}>{t("discovery.nextPage")}</Button></nav>
  </div>;
}
