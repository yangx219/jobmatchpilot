"use client";

import { Languages } from "lucide-react";
import { useI18n } from "./LanguageProvider";
import { parseLocale } from "@/lib/i18n/core";

export function LanguageSwitcher() {
  const { locale, setLocale, t, pending } = useI18n();
  return <label className="language-switcher"><Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="sr-only">{t("Langue")}</span><select aria-label={t("Langue")} value={locale} disabled={pending} onChange={(event) => setLocale(parseLocale(event.target.value))}><option value="fr" lang="fr">Français</option><option value="en" lang="en">English</option><option value="zh" lang="zh-CN">中文</option></select></label>;
}
