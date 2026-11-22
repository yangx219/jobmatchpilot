"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, translate, type Locale } from "@/lib/i18n/core";

// The root layout always supplies the user's server-resolved locale. English is
// the safe standalone fallback for isolated components (tests, previews and
// embeds) that are rendered without the application provider.
const LanguageContext = createContext({ locale: "en" as Locale, setLocale: (_locale: Locale) => {}, pending: false });

export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { document.documentElement.lang = locale === "zh" ? "zh-CN" : locale; }, [locale]);
  const setLocale = (next: Locale) => {
    updateLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    startTransition(() => router.refresh());
  };
  return <LanguageContext.Provider value={{ locale, setLocale, pending }}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const value = useContext(LanguageContext);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(value.locale, key, values), [value.locale]);
  return { ...value, t };
}
