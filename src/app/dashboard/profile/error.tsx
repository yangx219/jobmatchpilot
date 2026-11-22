"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return <section className="col-span-3 rounded-lg border bg-card p-6 space-y-4" role="alert">
    <h1 className="text-xl font-semibold">{t("docs.title")}</h1>
    <p className="text-sm text-muted-foreground">{t("docs.loadFailed")}</p>
    <div className="flex flex-wrap gap-2"><Button onClick={reset}>{t("docs.retry")}</Button><Button variant="outline" onClick={() => window.location.reload()}>{t("docs.reload")}</Button></div>
  </section>;
}
