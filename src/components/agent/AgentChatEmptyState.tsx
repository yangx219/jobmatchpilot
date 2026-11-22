"use client";

import { UiText } from "@/components/i18n/UiText";
import { useI18n } from "@/components/i18n/LanguageProvider";
import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useAgentChat } from "@/components/agent/AgentChatProvider";

const ADD_JOB = "Enregistrer une offre";
const EXAMPLES = [ADD_JOB, "Évaluer mon CV", "Analyser mon adéquation à cette offre", "Préparer une lettre de motivation"];

export function AgentChatEmptyState() {
  const { t } = useI18n();
  const { sendMessage, seedExchange, preflight } = useAgentChat();
  const handleClick = (example: string) => {
    if (!preflight.ok) return;
    if (example === ADD_JOB) {
      seedExchange(t(example), t("agent.addIntro"));
      return;
    }
    void sendMessage({ parts: [{ type: "text", text: t(example) }] });
  };
  return (
    <div className="flex flex-1 flex-col justify-end gap-5 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-accent text-primary"><Sparkles className="h-5 w-5" /></div>
      <h2 className="text-xl font-medium tracking-tight"><UiText text={"Une candidature mieux préparée."} /></h2>
      {!preflight.ok && <Link className="workspace-button workspace-button-secondary" href="/dashboard/settings"><FileText className="h-4 w-4" /> <UiText text={"Configurer le modèle IA"} /></Link>}
      <Suggestions>{EXAMPLES.map((example) => <Suggestion disabled={!preflight.ok} key={example} onClick={() => handleClick(example)} suggestion={t(example)} />)}</Suggestions>
    </div>
  );
}
