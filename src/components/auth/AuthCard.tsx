"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/LanguageProvider";
import SigninForm from "./SigninForm";
import SignupForm from "./SignupForm";

type AuthMode = "signin" | "signup";

interface AuthCardProps {
  mode: AuthMode;
}

export default function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-[410px] px-5">
      {/* App branding */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">JobMatchPilot</h1>
        <p className="text-sm text-muted-foreground">{t("Repérez. Préparez. Décrochez.")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("Votre recherche d’emploi, au même endroit.")}</p>
      </div>

      {/* Tab toggle */}
      <div className="mb-6 flex rounded-xl border bg-muted p-1">
        <button
          onClick={() => router.push("/?auth=signin")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === "signin"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >{t("Connexion")}</button>
        <button
          onClick={() => router.push("/?auth=signup")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === "signup"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >{t("Créer un compte")}</button>
      </div>

      {/* Form card */}
      <div className="auth-form-card">
        {mode === "signin" ? (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{t("Heureux de vous revoir")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("Retrouvez vos offres et vos prochaines étapes.")}</p>
            </div>
            <SigninForm />
          </>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{t("Votre prochain chapitre commence ici")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("Créez votre espace personnel pour organiser votre recherche.")}</p>
            </div>
            <SignupForm />
          </>
        )}
      </div>
    </div>
  );
}
