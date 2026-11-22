"use client";
import type { UseFormReturn } from "react-hook-form";
import type { CreateAutomationInput } from "@/models/automation.schema";
import { useI18n } from "@/components/i18n/LanguageProvider";

export function MarketSearchStep({ form }: { form: UseFormReturn<CreateAutomationInput> }) {
 const { t } = useI18n();
 const value = form.watch("sourceConfig.jobspy") ?? { sites: ["linkedin", "indeed", "hellowork"], searchTerms: [], searchLocation: "Paris, France", intervalHours: 1, analyzeWithAi: false };
 const set = (patch: Partial<typeof value>) => form.setValue("sourceConfig.jobspy", { ...value, ...patch }, { shouldDirty: true, shouldValidate: true });
 const field = "w-full rounded-md border bg-background p-2 text-sm";
 return <div className="space-y-4">
  <fieldset className="flex flex-wrap gap-3"><legend className="text-sm mb-2">{t("quick.source")}</legend>{(["linkedin", "indeed", "hellowork", "glassdoor"] as const).map((site) => <label className="flex items-center gap-2 text-sm capitalize" key={site}><input type="checkbox" checked={value.sites.includes(site)} onChange={(e) => set({ sites: e.target.checked ? [...value.sites, site] : value.sites.filter((item) => item !== site) })} />{site}</label>)}</fieldset>
  <label className="block text-sm space-y-1">{t("coverage.queries")}<input className={field} maxLength={360} value={value.searchTerms.join(", ")} onChange={(e) => set({ searchTerms: e.target.value.split(/[,，;；]/).map((term) => term.trim()).filter(Boolean) })} placeholder="développeur java junior, java spring boot" /></label>
  <label className="block text-sm space-y-1">{t("quick.location")}<input className={field} maxLength={120} value={value.searchLocation ?? "Paris, France"} onChange={(e) => set({ searchLocation: e.target.value })} /></label>
  <label className="block text-sm space-y-1">{t("quick.keywords")}<input className={field} maxLength={500} value={value.keywords?.join(", ") ?? ""} onChange={(e) => set({ keywords: e.target.value.split(/[,，;；]/).map((term) => term.trim()).filter(Boolean) })} /></label>
  <label className="block text-sm space-y-1">{t("coverage.excluded")}<input className={field} value={value.excludedTitleTerms?.join(", ") ?? ""} onChange={(e) => set({ excludedTitleTerms: e.target.value.split(/[,，;；]/).map((term) => term.trim()).filter(Boolean) })} /></label>
 </div>;
}
