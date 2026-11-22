"use client";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarCheck, Radar, Sparkles } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/LanguageProvider";
import AuthCard from "@/components/auth/AuthCard";

export function LandingPage({ authMode }: { authMode?: "signin" | "signup" }) {
  const { t } = useI18n();
  const nav = [{ icon: Radar, label: "discovery.title" }, { icon: BriefcaseBusiness, label: "Mes offres" }, { icon: CalendarCheck, label: "Entretiens" }, { icon: Sparkles, label: "Assistant IA" }];
  const jobs = [["Développeur Java Junior", "Paris · CDI", "Java · Spring Boot"], ["Software Engineer", "Île-de-France · CDI", "Java · SQL · REST"], ["Full Stack Developer", "Paris · CDI", "Vue · TypeScript"]];
  return <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
    <header className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 border-b px-4 py-2 sm:px-5"><Link href="/" className="flex min-w-0 items-center gap-2 font-semibold"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><BriefcaseBusiness className="h-4 w-4" /></span><span className="truncate">{BRAND_NAME}</span></Link><div className="flex shrink-0 items-center gap-2"><LanguageSwitcher /><Link href="/?auth=signin" className="hidden rounded-md border bg-white px-3 py-2 text-sm sm:inline-flex">{t("Connexion")}</Link><Link href="/?auth=signup" className="whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm text-white"><span className="sm:hidden">{t("landing.startShort")}</span><span className="hidden sm:inline">{t("landing.start")}</span></Link></div></header>
    {authMode ? <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5"><AuthCard mode={authMode} /></section> :
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-xl border bg-white p-4"><h1 className="text-xl font-semibold">{t("Vue d’ensemble")}</h1><nav className="mt-5 space-y-1 text-sm">{nav.map(({ icon: Icon, label }, index) => <div key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${index === 0 ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600"}`}><Icon className="h-4 w-4" />{t(label)}</div>)}</nav></aside>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">{t("landing.previewTitle")}</h2><p className="text-sm text-slate-500">Paris · Java · Spring Boot · CDI</p></div><Link href="/?auth=signup" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">{t("landing.start")}<ArrowRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-4 sm:grid-cols-3">{[["12", t("discovery.title")], ["4", t("Mes offres")], ["2", t("Entretiens")]].map(([value, label]) => <div key={label} className="rounded-xl border bg-white p-5"><div className="text-3xl font-semibold">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>)}</div>
        <div className="rounded-xl border bg-white"><div className="flex items-center justify-between border-b px-5 py-4"><h3 className="font-semibold">{t("discovery.title")}</h3><span className="text-xs text-slate-500">{t("landing.preview")}</span></div><div className="divide-y">{jobs.map(([title, meta, skills]) => <div key={title} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="font-medium">{title}</div><div className="mt-1 text-sm text-slate-500">{meta}</div></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{skills}</span></div>)}</div></div>
      </div>
    </section>}
  </main>;
}
