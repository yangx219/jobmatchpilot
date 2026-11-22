"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useAgentChat } from "@/components/agent/AgentChatProvider";

export function AssistantLaunch({ compact = false }: { compact?: boolean }) {
  const { open } = useAgentChat();
  const { t } = useI18n();
  return (
    <button onClick={open} type="button" className={compact ? "workspace-button workspace-button-secondary" : "workspace-button workspace-button-primary"}>
      <Sparkles className="h-4 w-4" />
      {t(compact ? "Assistant IA" : "Ouvrir mon assistant")}
      {!compact && <ArrowUpRight className="h-4 w-4" />}
    </button>
  );
}
