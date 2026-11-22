"use client";

import { MessageSquare, PanelRight } from "lucide-react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { useAgentChat } from "@/components/agent/AgentChatProvider";

export function AgentChatTrigger() {
  const { t } = useI18n();
  const { isOpen, open, close, approvalPending } = useAgentChat();

  return (
    <Button
      variant="outline"
      className="relative h-10 w-10 px-2 sm:w-auto sm:px-4"
      aria-label={t(isOpen ? "Close assistant" : "Open assistant")}
      onClick={() => (isOpen ? close() : open())}
    >
      {isOpen ? (
        <PanelRight className="h-4 w-4" />
      ) : (
        <>
          <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">{t("Assistant IA")}</span></>
      )}
      {/* Deliberately no streaming state: nothing generates while the panel
          is closed, so there is no background activity to advertise. */}
      {approvalPending && (
        <span
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"
          aria-label="Approval pending"
        />
      )}
    </Button>
  );
}
