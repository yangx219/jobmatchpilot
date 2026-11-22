"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { ArrowUpRight, BriefcaseBusiness, Radar, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="jobmatchpilot-auth">
      <aside className="auth-showcase" aria-label="Votre espace de recherche d’emploi">
        <div className="auth-wordmark"><span className="auth-logo"><ArrowUpRight className="h-5 w-5" /></span>JobMatchPilot</div>
        <div className="auth-story">
          <span className="auth-kicker"><span />{t("VOTRE PROCHAIN CHAPITRE")}</span>
          <h2>{t("Moins de dispersion.")}<br />Plus de <em>perspectives.</em></h2>
          <p>{t("auth.story")}</p>
          <div className="auth-workflow">
            {[
              { icon: Radar, number: "01", title: "Repérez.", text: "Rassemblez les opportunités qui comptent." },
              { icon: Sparkles, number: "02", title: "Préparez.", text: "Appuyez chaque candidature sur votre parcours." },
              { icon: BriefcaseBusiness, number: "03", title: "Décrochez.", text: "Gardez une vue claire sur vos prochaines étapes." },
            ].map(({ icon: Icon, number, title, text }) => <div key={number} className="auth-workflow-row"><span className="auth-workflow-icon"><Icon className="h-4 w-4" /></span><div><h3>{t(title)}</h3><p>{t(text)}</p></div><span className="auth-workflow-number">{number}</span></div>)}
          </div>
        </div>
        <div className="auth-bottom"><span>{t("Votre recherche, à votre rythme.")}</span><span>{t("Paris & au-delà")}<ArrowUpRight className="h-3 w-3" /></span></div>
      </aside>
      <div className="auth-form-region"><div className="auth-language-bar"><Link href="/">{t("Accueil")}</Link><LanguageSwitcher /></div>{children}<p className="auth-form-footer">{t("Un espace pour faire avancer votre recherche.")}</p></div>
    </main>
  );
}
