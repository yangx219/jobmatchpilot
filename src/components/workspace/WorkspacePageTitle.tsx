"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { SIDEBAR_LINKS } from "@/lib/constants";

export function WorkspacePageTitle() {
  const path = usePathname();
  const { t } = useI18n();
  const title = path.startsWith("/dashboard/settings") ? "Paramètres" : path.startsWith("/dashboard/notifications") ? "Notifications" :
    [...SIDEBAR_LINKS].reverse().find((link) => path === link.route || path.startsWith(`${link.route}/`))?.label ?? "Mon espace";
  return <div className="hidden min-w-0 text-sm sm:block"><span className="hidden text-muted-foreground lg:inline">{t("Mon espace")}<span className="mx-3 text-border">/</span></span><span className="truncate font-medium">{t(title)}</span></div>;
}
