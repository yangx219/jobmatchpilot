"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";

type Step = { id: string; name: string; status: string };
type Workflow = { id: string; status: string; output?: string | null; errorCode?: string | null; steps: Step[] };

const labels: Record<string, string> = {
  prepare_context: "Preparing resume and job",
  generate_letter: "Writing tailored draft",
  validate_output: "Checking claims and format",
  await_approval: "Waiting for your approval",
};

export function WorkflowCoverLetterPanel({
  jobId,
  resumeId,
  disabled,
  hasLetter,
  trigger = 0,
  onCompleted,
}: {
  jobId: string;
  resumeId?: string;
  disabled?: boolean;
  hasLetter: boolean;
  trigger?: number;
  onCompleted: () => void;
}) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [busy, setBusy] = useState(false);
  const active = workflow && ["QUEUED", "RUNNING"].includes(workflow.status);

  const start = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/v2/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `cover-letter:${jobId}:${Date.now()}` },
        body: JSON.stringify({ type: "cover_letter", jobId, ...(resumeId ? { resumeId } : {}), ...(hasLetter ? { force: true } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not start the cover letter workflow.");
      setWorkflow(body.data);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not start the cover letter workflow.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (trigger > 0 && !disabled && !active && !busy) void start();
    // Trigger is an event counter from the header action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    if (!workflow?.id || !["QUEUED", "RUNNING"].includes(workflow.status)) return;
    let stopped = false;
    const poll = async () => {
      const response = await fetch(`/api/v2/workflows/${workflow.id}`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const next = (await response.json()).data as Workflow;
      setWorkflow(next);
      if (next.status === "FAILED") toastError(next.errorCode || "Cover letter generation failed.");
    };
    const timer = setInterval(() => void poll(), 1500);
    return () => { stopped = true; clearInterval(timer); };
  }, [workflow?.id, workflow?.status]);

  const cancel = async () => {
    if (!workflow) return;
    await fetch(`/api/v2/workflows/${workflow.id}/cancel`, { method: "POST" });
    setWorkflow((current) => current ? { ...current, status: "CANCELLED" } : current);
  };

  const approve = async () => {
    if (!workflow) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v2/workflows/${workflow.id}/approve`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not save the draft.");
      setWorkflow((current) => current ? { ...current, status: "COMPLETED" } : current);
      toastSuccess("Cover letter approved and saved.");
      onCompleted();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not save the draft.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={start} disabled={disabled || busy || Boolean(active)}>
          {busy || active ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {active ? "Writing…" : hasLetter ? "Create another draft" : "Generate draft"}
        </Button>
        {(active || workflow?.status === "WAITING_APPROVAL") && (
          <Button size="sm" variant="ghost" onClick={cancel}><X className="size-4" />Discard</Button>
        )}
      </div>

      {workflow && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {workflow.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                <span className={`size-2 rounded-full ${step.status === "COMPLETED" ? "bg-emerald-500" : step.status === "RUNNING" ? "animate-pulse bg-blue-500" : "bg-slate-300"}`} />
                {labels[step.name] ?? step.name}
              </div>
            ))}
          </div>
          {workflow.status === "WAITING_APPROVAL" && workflow.output && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-md bg-background p-4 text-sm leading-6">{workflow.output}</div>
              <Button size="sm" onClick={approve} disabled={busy}><Check className="size-4" />Approve and save</Button>
            </div>
          )}
          {workflow.status === "FAILED" && <p className="mt-3 text-xs text-red-600">{workflow.errorCode || "Generation failed"}</p>}
        </div>
      )}
    </div>
  );
}
