"use client";

import { useI18n } from "./LanguageProvider";

// Use only for application-owned labels, never user content or job descriptions.
export function UiText({ text }: { text: string }) {
  const { t } = useI18n();
  return <>{t(text)}</>;
}
