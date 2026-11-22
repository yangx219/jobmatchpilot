"use client";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, MapPin, Pencil, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserSettings } from "@/actions/userSettings.actions";
import { generateCareerProfileFromResume, updateCareerProfile } from "@/actions/careerProfile.actions";
import type { CareerProfile } from "@/models/userSettings.model";
import { toastError, toastSuccess } from "@/lib/toast";
import { useI18n } from "@/components/i18n/LanguageProvider";

const join = (values: string[]) => values.join(", ");
const split = (value: string) => [...new Set(value.split(/[,，;；\n]/).map((item) => item.trim()).filter(Boolean))];
function Chips({ values, blue = false }: { values: string[]; blue?: boolean }) { return <div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className={blue ? "rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-100" : "rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700"}>{value}</span>)}</div>; }

export function CareerProfileCard() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [draft, setDraft] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => { getUserSettings().then((result) => { if (result?.success) setProfile(result.data?.settings?.careerProfile ?? null); }).finally(() => setLoading(false)); }, []);
  async function generate() { setBusy(true); const result = await generateCareerProfileFromResume(); if (result?.success && "data" in result && result.data) { setProfile(result.data); setDraft(result.data); toastSuccess(t("career.generated")); } else toastError(result && "message" in result ? result.message : t("career.generateFailed")); setBusy(false); }
  async function save() { if (!draft) return; setBusy(true); const result = await updateCareerProfile(draft); if (result?.success && "data" in result && result.data) { setProfile(result.data); setDraft(result.data); setEditing(false); toastSuccess(t("career.saved")); } else toastError(result && "message" in result ? result.message : t("career.saveFailed")); setBusy(false); }
  const listKeys = ["targetTitles", "adjacentTitles", "coreSkills", "optionalSkills", "locations", "contractTypes", "excludedTitleTerms"] as const;
  const labels = { targetTitles: t("career.targets"), adjacentTitles: t("career.adjacent"), coreSkills: t("career.coreSkills"), optionalSkills: t("career.optionalSkills"), locations: t("career.locations"), contractTypes: t("career.contracts"), excludedTitleTerms: t("career.exclusions") };
  const field = "min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-base leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
  return <Card className="overflow-hidden border-slate-200 shadow-sm">
    <CardHeader className="border-b bg-gradient-to-r from-blue-50/80 via-white to-white sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-sm"><BriefcaseBusiness className="h-5 w-5" /></span><div><CardTitle className="text-lg">{t("career.title")}</CardTitle>{profile && <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500"><span>{profile.targetTitles.length} {t("career.roles")}</span><span>{profile.coreSkills.length} {t("career.skills")}</span><span>{profile.seniority === "junior" ? "Junior / Graduate" : profile.seniority}</span></div>}</div></div>
      <div className="flex flex-wrap gap-2">{profile && !editing && <Button variant="outline" onClick={() => { setDraft(profile); setEditing(true); }}><Pencil className="mr-2 h-4 w-4" />{t("career.edit")}</Button>}<Button variant={profile ? "ghost" : "default"} onClick={generate} disabled={busy || loading}>{profile ? <RotateCcw className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}{profile ? t("career.regenerate") : t("career.generate")}</Button></div>
    </CardHeader>
    <CardContent className="p-5 sm:p-6">{loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-100" /> : !profile ? <div className="grid min-h-32 place-items-center text-sm text-muted-foreground">{t("career.empty")}</div> : editing && draft ? <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">{listKeys.map((key) => <label key={key} className={`space-y-2 text-sm font-medium ${key === "excludedTitleTerms" ? "lg:col-span-2" : ""}`}>{labels[key]}<textarea className={field} value={join(draft[key])} onChange={(event) => setDraft({ ...draft, [key]: split(event.target.value) })} /></label>)}</div>
      <label className="block max-w-xs space-y-2 text-sm font-medium">{t("career.seniority")}<select className="h-11 w-full rounded-xl border bg-background px-3 text-base" value={draft.seniority} onChange={(event) => setDraft({ ...draft, seniority: event.target.value as CareerProfile["seniority"] })}><option value="junior">Junior / Graduate</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="any">{t("career.any")}</option></select></label>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => { setEditing(false); setDraft(profile); }}>{t("Cancel")}</Button><Button onClick={save} disabled={busy || draft.targetTitles.length === 0}><Save className="mr-2 h-4 w-4" />{busy ? t("career.saving") : t("career.save")}</Button></div>
    </div> : <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2"><section><h3 className="mb-3 text-sm font-semibold text-slate-500">{t("career.targets")}</h3><Chips values={profile.targetTitles} blue />{profile.adjacentTitles.length > 0 && <div className="mt-3"><Chips values={profile.adjacentTitles} /></div>}</section><section><h3 className="mb-3 text-sm font-semibold text-slate-500">{t("career.coreSkills")}</h3><Chips values={profile.coreSkills} blue />{profile.optionalSkills.length > 0 && <div className="mt-3"><Chips values={profile.optionalSkills} /></div>}</section></div>
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"><MapPin className="mb-2 h-4 w-4 text-blue-600" /><Chips values={profile.locations} /></div><div className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("career.contracts")}</div><Chips values={profile.contractTypes} /></div><div className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("career.seniority")}</div><span className="text-sm font-medium">{profile.seniority === "junior" ? "Junior / Graduate" : profile.seniority}</span></div></div>
      <details className="rounded-xl border px-4 py-3"><summary className="cursor-pointer list-none text-sm font-medium text-slate-600">{t("career.exclusions")} · {profile.excludedTitleTerms.length}</summary><div className="mt-3"><Chips values={profile.excludedTitleTerms} /></div></details>
    </div>}</CardContent>
  </Card>;
}
