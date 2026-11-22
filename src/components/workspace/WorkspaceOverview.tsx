"use client";

import { UiText } from "@/components/i18n/UiText";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { localeTags } from "@/lib/i18n/core";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, FileText, Layers3, MapPin, Plus, Radar, Sparkles } from "lucide-react";
import type { WorkspaceOverview as Overview } from "@/lib/workspace";
import { AssistantLaunch } from "./AssistantLaunch";

const statusNames: Record<string, string> = {
  new: "À découvrir", draft: "À préparer", applied: "Candidature envoyée", interview: "Entretien",
  offer: "Offre reçue", "offer-accepted": "Offre acceptée", "offer-declined": "Offre déclinée",
  rejected: "Refus", expired: "Expirée", archived: "Archivée", withdrawn: "Retirée",
};

function hasAiAnalysis(value: string | null) {
  try { return JSON.parse(value ?? "{}").analyzed === true; } catch { return false; }
}

function shortDate(date: Date, tag: string) {
  return new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(date);
}

export function WorkspaceOverview({ data, name }: { data: Overview; name: string }) {
  const { t, locale } = useI18n();
  const firstName = name.trim().split(/\s+/)[0];
  const active = data.automations.filter((automation) => automation.status === "active").length;
  const steps = [
    { title: t("Ajoutez votre CV"), text: t("Une base concrète pour préparer vos candidatures."), href: "/dashboard/profile", done: data.resumes > 0, icon: FileText },
    { title: t("Créez votre veille"), text: t("Choisissez les entreprises et les postes à suivre."), href: "/dashboard/automations?add-automation=true", done: data.automations.length > 0, icon: Radar },
    { title: t("Préparez une candidature"), text: t("Ouvrez une offre pour analyser votre adéquation."), href: "/dashboard/myjobs", done: data.applied > 0, icon: ArrowUpRight },
  ];
  return (
    <div className="workspace-home col-span-3 min-w-0" lang={locale}>
      <section className="workspace-welcome">
        <div>
          <div className="workspace-eyebrow"><span className="workspace-status-dot" />{t("VOTRE ESPACE CARRIÈRE")}</div>
          <h1>{t("Bonjour")}{firstName ? `, ${firstName}` : ""}<span className="text-primary">.</span></h1>
          <p>{t("Les bonnes opportunités. Un prochain pas clair.")}</p>
        </div>
        <Link href="/dashboard/myjobs?add-job=true" className="workspace-button workspace-button-primary"><Plus className="h-4 w-4" />{t("Ajouter une offre")}</Link>
      </section>

      <section className="workspace-metrics" aria-label="Votre recherche en chiffres">
        {[
          { label: t("Offres enregistrées"), count: data.jobs, hint: t("Dans votre espace"), icon: BriefcaseBusiness, href: "/dashboard/myjobs" },
          { label: t("Nouvelles découvertes"), count: data.discovered, hint: t("À examiner"), icon: Radar, href: "/dashboard/automations" },
          { label: t("Candidatures envoyées"), count: data.applied, hint: t("Depuis le début"), icon: ArrowUpRight, href: "/dashboard/myjobs" },
          { label: t("En entretien"), count: data.interviewing, hint: t("Statut actuel des offres"), icon: Layers3, href: "/dashboard/interviews" },
        ].map(({ label, count, hint, icon: Icon, href }) => (
          <Link key={label} href={href} className="workspace-metric">
            <div className="flex items-center justify-between gap-2"><span>{t(label)}</span><Icon className="h-4 w-4 text-primary" /></div>
            <strong>{count.toLocaleString(localeTags[locale])}</strong>
            <small>{t(hint)}</small>
          </Link>
        ))}
      </section>

      <div className="workspace-columns">
        <div className="min-w-0 space-y-6">
          <section className="workspace-panel">
            <div className="workspace-panel-heading"><div><div className="workspace-eyebrow">{t("VOTRE SÉLECTION")}</div><h2>{t("Les dernières offres")}</h2></div><Link href="/dashboard/myjobs" className="workspace-text-link">{t("Tout voir")}<ArrowUpRight className="h-4 w-4" /></Link></div>
            {data.recentJobs.length === 0 ? (
              <div className="workspace-empty">
                <div className="workspace-empty-icon"><BriefcaseBusiness className="h-6 w-6" /></div>
                <h3>{t("Votre prochaine opportunité commence ici.")}</h3>
                <p>{t("workspace.empty")}</p>
                <div className="flex flex-wrap justify-center gap-3"><Link href="/dashboard/automations?add-automation=true" className="workspace-button workspace-button-primary"><Radar className="h-4 w-4" />{t("Créer une veille")}</Link><Link href="/dashboard/myjobs?add-job=true" className="workspace-button workspace-button-secondary">{t("Ajouter une offre")}<ArrowRight className="h-4 w-4" /></Link></div>
              </div>
            ) : (
              <div className="workspace-job-list">
                {data.recentJobs.map((job) => (
                  <Link href={`/dashboard/myjobs/${job.id}`} key={job.id} className="workspace-job-row">
                    <span className="workspace-company-avatar">{job.Company.label.slice(0, 2).toUpperCase()}</span>
                    <div className="min-w-0 flex-1"><h3 className="truncate">{job.JobTitle.label}</h3><p className="truncate">{job.Company.label} <span aria-hidden>·</span> {job.Location?.label ?? t("Lieu non précisé")}</p><div className="mt-2 flex flex-wrap gap-2"><span className="workspace-pill">{t(statusNames[job.Status.value] ?? job.Status.label)}</span>{hasAiAnalysis(job.matchData) && job.matchScore !== null && <span className="workspace-pill workspace-pill-teal"><Sparkles className="h-3 w-3" /> <UiText text={"Adéquation"} />{job.matchScore}/100</span>}</div></div>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{shortDate(job.createdAt, localeTags[locale])}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-heading"><div><div className="workspace-eyebrow">{t("AVANCER SANS S’ÉPARPILLER")}</div><h2>{t("Votre prochain pas")}</h2></div><span className="workspace-pill">{steps.filter((step) => step.done).length} / 3</span></div>
            <div className="workspace-steps">{steps.map(({ title, text, href, done, icon: Icon }, index) => (
              <Link href={href} key={title} className="workspace-step"><span className={`workspace-step-number ${done ? "is-complete" : ""}`}>{done ? <Check className="h-4 w-4" /> : `0${index + 1}`}</span><div className="min-w-0 flex-1"><h3>{t(title)}</h3><p>{t(text)}</p></div><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>
            ))}</div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Préparation et veille">
          <section className="workspace-assistant-card">
            <span className="workspace-assistant-icon"><Sparkles className="h-5 w-5" /></span>
            <span className="workspace-pill workspace-pill-light">{t("VOTRE COPILOTE")}</span>
            <h2>{t("De l’offre à une candidature préparée.")}</h2>
            <p>{t("workspace.assistant")}</p>
            <ul><li><Check className="h-3.5 w-3.5" />{t("Une analyse liée à votre CV")}</li><li><Check className="h-3.5 w-3.5" />{t("Des écarts à travailler")}</li><li><Check className="h-3.5 w-3.5" />{t("Une lettre à relire et personnaliser")}</li></ul>
            {data.modelSelected ? <AssistantLaunch /> : <Link href="/dashboard/settings" className="workspace-button workspace-button-primary"><Sparkles className="h-4 w-4" />{t("Configurer mon assistant")}<ArrowUpRight className="h-4 w-4" /></Link>}
            <small>{data.modelSelected ? t("Modèle sélectionné · connexion vérifiée à l’ouverture") : t("Choisissez un modèle IA dans les paramètres.")}</small>
          </section>

          <section className="workspace-panel workspace-watch">
            <div className="flex items-center justify-between"><h2><Radar className="h-4 w-4" />{t("Votre veille")}</h2><span className="workspace-pill">{t("activeCount", { count: active })}</span></div>
            {data.automations.length ? data.automations.slice(0, 3).map((automation) => {
              const latest = automation.runs[0];
              return <Link key={automation.id} href={`/dashboard/automations/${automation.id}`} className="workspace-watch-row"><div className="min-w-0"><h3 className="truncate">{automation.name}</h3><p>{automation.jobBoard} · {automation.status === "active" ? t("Active") : t("En pause")}</p><p>{!latest ? t("Aucune exécution") : latest.status === "completed" || latest.status === "completed_with_errors" ? `${t("lastSaved", { count: latest.jobsSaved })}${latest.status === "completed_with_errors" ? ` · ${t("avec erreurs")}` : ""}` : latest.status === "running" || latest.status === "cancelling" ? t("Exécution en cours") : latest.status === "cancelled" ? t("Dernier passage annulé") : t("Dernier passage en échec")}</p></div><ArrowUpRight className="h-4 w-4 shrink-0" /></Link>;
            }) : <p className="py-5 text-sm leading-relaxed text-muted-foreground">{t("workspace.watchEmpty")}</p>}
            <Link href="/dashboard/automations" className="workspace-text-link">{t("Gérer ma veille")}<ArrowRight className="h-4 w-4" /></Link>
          </section>
          <p className="workspace-footnote"><MapPin className="h-3.5 w-3.5 shrink-0" />{t("À vous de choisir vos postes, vos entreprises et vos critères.")}</p>
        </aside>
      </div>
      <footer className="workspace-footer"><span>{t("Repérez. Préparez. Décrochez.")}</span><Link href="/dashboard/profile"><ArrowDownToLine className="h-3.5 w-3.5" />{t("Mes CV et documents")}</Link></footer>
    </div>
  );
}
