import "server-only";
import { cookies } from "next/headers";
import { LEGACY_LOCALE_COOKIE, LOCALE_COOKIE, parseLocale, translate } from "./core";

export async function getI18n() {
  const cookieStore = await cookies();
  const locale = parseLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ?? cookieStore.get(LEGACY_LOCALE_COOKIE)?.value,
  );
  return { locale, t: (key: string, values?: Record<string, string | number>) => translate(locale, key, values) };
}
