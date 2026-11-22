"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ResumeTailorOutput } from "@/models/resumeTailor.schema";

type Workflow = { id: string; status: string; output?: string | null; errorCode?: string | null };

export function ResumeTailorPanel({ jobId, resumeId, disabled, onCompleted }: { jobId: string; resumeId?: string; disabled?: boolean; onCompleted: (resumeId: string) => void }) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const active = workflow && ["QUEUED", "RUNNING"].includes(workflow.status);
  const draft = useMemo(() => {
    if (!workflow?.output) return null;
    try { return JSON.parse(workflow.output) as ResumeTailorOutput; } catch { return null; }
  }, [workflow?.output]);

  const start = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/v2/workflows", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `resume-tailor:${jobId}:${Date.now()}` }, body: JSON.stringify({ type: "resume_tailor", jobId, ...(resumeId ? { resumeId } : {}), force: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not start resume tailoring.");
      setWorkflow(body.data);
    } catch (error) { toastError(error instanceof Error ? error.message : "Could not start resume tailoring."); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!workflow?.id || !active) return;
    let stopped = false;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/v2/workflows/${workflow.id}`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const next = (await response.json()).data as Workflow;
      setWorkflow(next);
      if (next.status === "WAITING_APPROVAL" && next.output) {
        try { setSelected((JSON.parse(next.output) as ResumeTailorOutput).suggestions.map((_, index) => index)); } catch {}
      }
      if (next.status === "FAILED") toastError(next.errorCode || "Resume tailoring failed.");
    }, 1500);
    return () => { stopped = true; clearInterval(timer); };
  }, [workflow?.id, active]);

  const cancel = async () => {
    if (!workflow) return;
    await fetch(`/api/v2/workflows/${workflow.id}/cancel`, { method: "POST" });
    setWorkflow((value) => value ? { ...value, status: "CANCELLED" } : value);
  };

  const approve = async () => {
    if (!workflow || selected.length === 0) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v2/workflows/${workflow.id}/approve-tailoring`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedIndexes: selected }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not create tailored resume.");
      toastSuccess("Tailored resume copy created.");
      setWorkflow((value) => value ? { ...value, status: "COMPLETED" } : value);
      onCompleted(body.data.id);
    } catch (error) { toastError(error instanceof Error ? error.message : "Could not create tailored resume."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={start} disabled={disabled || busy || Boolean(active)}>{busy || active ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}{active ? "Preparing suggestions…" : "Tailor resume"}</Button>
        {(active || workflow?.status === "WAITING_APPROVAL") && <Button size="sm" variant="ghost" onClick={cancel}><X className="size-4" />Discard</Button>}
      </div>
      {draft && workflow?.status === "WAITING_APPROVAL" && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">{draft.summary}</p>
          {draft.suggestions.map((item, index) => (
            <label key={index} className="flex cursor-pointer gap-3 rounded-md border bg-background p-3">
              <input type="checkbox" className="mt-1 size-4 rounded border-input accent-primary" checked={selected.includes(index)} onChange={(event) => setSelected((values) => event.target.checked ? [...values, index].sort() : values.filter((value) => value !== index))} />
              <span className="min-w-0 space-y-1 text-sm"><span className="block font-medium">{item.section}</span><span className="block text-xs text-muted-foreground line-through">{item.original}</span><span className="block">{item.proposed}</span><span className="block text-xs text-muted-foreground">{item.rationale}</span></span>
            </label>
          ))}
          <Button size="sm" onClick={approve} disabled={busy || selected.length === 0}>Create tailored copy ({selected.length})</Button>
        </div>
      )}
    </div>
  );
}
