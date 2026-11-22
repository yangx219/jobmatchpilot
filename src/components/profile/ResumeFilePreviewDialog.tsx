"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/components/i18n/LanguageProvider";

export function ResumeFilePreviewDialog({ open, onOpenChange, resumeId, title }: { open: boolean; onOpenChange: (open: boolean) => void; resumeId: string; title: string }) {
  const { t } = useI18n();
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex h-[92dvh] max-w-5xl flex-col gap-3 p-4 sm:p-5"><DialogHeader><DialogTitle>{t("resume.originalPreview")} · {title}</DialogTitle></DialogHeader>{open && <iframe title={t("resume.originalPreview")} src={`/api/profile/resume?resumeId=${encodeURIComponent(resumeId)}&preview=1`} sandbox="" className="min-h-0 flex-1 rounded-xl border bg-slate-100" />}</DialogContent></Dialog>;
}
