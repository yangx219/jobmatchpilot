"use client";

import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { localeTags } from "@/lib/i18n/core";

export function AnalyticsHeader({ today }: { today: string }) {
  const { t, locale } = useI18n();
  const date = new Intl.DateTimeFormat(localeTags[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(`${today}T12:00:00Z`));
  return <div className="analytics-header"><h1>{t("Vue d’ensemble")}</h1><div className="analytics-header-actions"><time dateTime={today}><CalendarDays className="h-4 w-4" />{date}</time><Link href="/dashboard/myjobs?add-job=true" className="workspace-button workspace-button-primary"><Plus className="h-4 w-4" />{t("Ajouter une offre")}</Link></div></div>;
}
