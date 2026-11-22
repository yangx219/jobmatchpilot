import { messages } from "./messages";

export const LOCALES = ["fr", "en", "zh"] as const;
export type Locale = typeof LOCALES[number];
export const LOCALE_COOKIE = "jobmatchpilot-language";
export const LEGACY_LOCALE_COOKIE = "rolemora-language";
export const localeTags: Record<Locale, string> = { fr: "fr-FR", en: "en-US", zh: "zh-CN" };
export function parseLocale(value?: string | null): Locale {
  return LOCALES.includes(value as Locale) ? value as Locale : "fr";
}
export function translate(locale: Locale, key: string, values: Record<string, string | number> = {}) {
  const row = messages[key];
  const text = row ? row[LOCALES.indexOf(locale)] : key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => values[name] === undefined ? match : String(values[name]));
}
