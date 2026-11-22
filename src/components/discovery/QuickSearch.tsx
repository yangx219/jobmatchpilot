"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { CompanyPicker } from "@/components/automations/ats-search-step/CompanyPicker";
import { createAutomation } from "@/actions/automation.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import type { JobBoard, LeverCompany } from "@/models/automation.model";
import { getUserSettings } from "@/actions/userSettings.actions";

export function QuickSearch({ resumes, onCreated, initiallyOpen }: {
  resumes: { id: string; title: string }[];
  onCreated: (id: string) => Promise<void>;
  initiallyOpen: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(initiallyOpen);
  const [provider, setProvider] = useState<JobBoard>("greenhouse");
  const [companies, setCompanies] = useState<LeverCompany[]>([]);
  const [role, setRole] = useState("Junior Java Developer");
  const [keywords, setKeywords] = useState("Java, Spring Boot, SQL");
  const [location, setLocation] = useState("Paris");
  const [excludedTitleTerms, setExcludedTitleTerms] = useState<string[]>([]);
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  useEffect(() => {
    getUserSettings().then((result) => {
      const profile = result?.data?.settings?.careerProfile;
      if (!result?.success || !profile) return;
      if (profile.targetTitles?.[0]) setRole(profile.targetTitles[0]);
      if (profile.coreSkills?.length) setKeywords(profile.coreSkills.join(", "));
      if (profile.locations?.length) setLocation(profile.locations.join(", "));
      if (profile.excludedTitleTerms?.length) setExcludedTitleTerms(profile.excludedTitleTerms);
    }).catch(() => {});
  }, []);
  const fieldClass = "w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !role.trim() || !resumeId || !companies.length) return;
    setBusy(true); setError("");
    try {
      const result = await createAutomation({
        name: `${role.trim()}${location.trim() ? ` · ${location.trim()}` : ""}`.slice(0, 100),
        jobBoard: provider, resumeId, keywords: "", location: "", scheduleHour: 8, matchThreshold: 80,
        sourceConfig: { [provider]: { companies, targetTitles: [role.trim()],
          keywords: keywords.split(/[,，;；]/).map((term) => term.trim()).filter(Boolean),
          excludedTitleTerms,
          locations: location.trim() ? [location.trim()] : [], strictLocation: !!location.trim(),
          intervalHours: 1, analyzeWithAi: false, saveUnanalyzed: true, topK: APP_CONSTANTS.ATS_LISTING_CAP } },
      });
      if (!result.success || !result.data) { setError(result.message ?? t("quick.failed")); return; }
      setOpen(false);
      await onCreated(result.data.id);
    } catch { setError(t("quick.failed")); }
    finally { setBusy(false); }
  }
  return <section className="rounded-lg border bg-card p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{t("quick.title")}</h2><Button type="button" variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>{t(open ? "quick.close" : "quick.open")}</Button></div>
    {open && <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2" aria-label={t("quick.progress")}>
        {[1, 2, 3].map((item) => <button key={item} type="button" onClick={() => setStep(item)} className={`rounded-md border px-2 py-2 text-left text-xs sm:text-sm ${step === item ? "border-blue-600 bg-blue-50 font-medium text-blue-700" : "bg-background text-muted-foreground"}`}><span className="mr-1 font-semibold">{item}</span>{t(`quick.step${item}`)}</button>)}
      </div>
      {step === 1 && <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">{t("quick.role")}<input required value={role} maxLength={100} onChange={(e) => setRole(e.target.value)} className={fieldClass} /></label>
        <label className="space-y-1 text-sm">{t("quick.keywords")}<input value={keywords} maxLength={500} onChange={(e) => setKeywords(e.target.value)} className={fieldClass} /></label>
        <label className="space-y-1 text-sm">{t("quick.location")}<input value={location} maxLength={100} onChange={(e) => setLocation(e.target.value)} className={fieldClass} /></label>
      </div>}
      {step === 2 && <div className="space-y-4">
        <label className="block space-y-1 text-sm">{t("quick.source")}<select value={provider} onChange={(e) => { setProvider(e.target.value as JobBoard); setCompanies([]); }} className={fieldClass}><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option></select></label>
        <CompanyPicker provider={provider} companies={companies} onAdd={(company) => setCompanies((old) => old.some((c) => c.token === company.token) ? old : [...old, company])} onRemove={(token) => setCompanies((old) => old.filter((c) => c.token !== token))} onAddMany={(boards) => { const fresh = boards.filter((c) => !companies.some((old) => old.token === c.token)); const room = Math.max(0, APP_CONSTANTS.ATS_MAX_COMPANIES - companies.length); setCompanies([...companies, ...fresh.slice(0, room)]); return Math.max(0, fresh.length - room); }} />
      </div>}
      {step === 3 && <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <label className="block space-y-1 text-sm">{t("quick.resume")}<select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className={fieldClass}>{!resumes.length && <option value="">{t("quick.noResume")}</option>}{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}</select></label>
        <p className="text-sm text-muted-foreground">{role} · {location || t("quick.anyLocation")} · {companies.length} {t("quick.selectedCompanies")}</p>
      </div>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">{step > 1 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>{t("quick.previous")}</Button>}{step < 3 ? <Button type="button" onClick={() => setStep(step + 1)} disabled={(step === 1 && !role.trim()) || (step === 2 && !companies.length)}>{t("quick.next")}</Button> : <Button type="submit" disabled={busy || !resumeId || !companies.length || !role.trim()}>{t(busy ? "quick.creating" : "quick.start")}</Button>}{!resumes.length && step === 3 && <Link className="text-sm text-blue-600 underline" href="/dashboard/profile">{t("quick.addResume")}</Link>}</div>
    </form>}
  </section>;
}
