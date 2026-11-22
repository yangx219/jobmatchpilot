"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";

type Step = { id: string; name: string; status: string; errorCode?: string | null };
type Workflow = { id: string; status: string; errorCode?: string | null; steps: Step[] };

const labels: Record<string, string> = {
  prepare_context: "Preparing resume and job",
  generate_match: "Analyzing with AI",
  validate_output: "Validating evidence",
  persist_analysis: "Saving analysis",
};

export function WorkflowMatchPanel({
  jobId,
  resumeId,
  disabled,
  hasAnalysis,
  onCompleted,
  trigger = 0,
}: {
  jobId: string;
  resumeId?: string;
  disabled?: boolean;
  hasAnalysis: boolean;
  onCompleted: () => void;
  trigger?: number;
}) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [starting, setStarting] = useState(false);
  const workflowId = workflow?.id;
  const workflowStatus = workflow?.status;

  useEffect(() => {
    if (!workflowId || !workflowStatus || !["QUEUED", "RUNNING"].includes(workflowStatus)) return;
    let stopped = false;
    const poll = async () => {
      const response = await fetch(`/api/v2/workflows/${workflowId}`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const next = (await response.json()).data as Workflow;
      setWorkflow(next);
      if (next.status === "COMPLETED") {
        toastSuccess("Your AI match analysis is ready.");
        onCompleted();
      } else if (next.status === "FAILED") {
        toastError(next.errorCode || "The match workflow failed.");
      }
    };
    const timer = setInterval(() => void poll(), 1500);
    return () => { stopped = true; clearInterval(timer); };
  }, [workflowId, workflowStatus, onCompleted]);

  const start = async () => {
    setStarting(true);
    try {
      const response = await fetch("/api/v2/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `job-match:${jobId}:${Date.now()}` },
        body: JSON.stringify({ type: "job_match", jobId, ...(resumeId ? { resumeId } : {}), ...(hasAnalysis ? { force: true } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not start AI match.");
      setWorkflow(body.data);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not start AI match.");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (trigger > 0 && !disabled && !active && !starting) void start();
    // `trigger` is an event counter; the other values are intentionally read
    // from the render caused by that event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const cancel = async () => {
    if (!workflow) return;
    await fetch(`/api/v2/workflows/${workflow.id}/cancel`, { method: "POST" });
    setWorkflow((current) => current ? { ...current, status: "CANCELLED" } : current);
  };

  const active = workflow && ["QUEUED", "RUNNING"].includes(workflow.status);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={start} disabled={disabled || starting || Boolean(active)}>
          {starting || active ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {active ? "Matching…" : hasAnalysis ? "Run again" : "Match with AI"}
        </Button>
        {active && <Button size="sm" variant="ghost" onClick={cancel}><X className="size-4" />Cancel</Button>}
      </div>
      {workflow && (
        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">AI workflow</span>
            <span className="text-xs text-muted-foreground">{workflow.status.toLowerCase().replace("_", " ")}</span>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {workflow.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                <span className={`size-2 rounded-full ${step.status === "COMPLETED" ? "bg-emerald-500" : step.status === "RUNNING" ? "animate-pulse bg-blue-500" : step.status === "FAILED" ? "bg-red-500" : "bg-slate-300"}`} />
                <span>{labels[step.name] ?? step.name}</span>
              </div>
            ))}
          </div>
          {workflow.status === "FAILED" && <p className="mt-2 text-xs text-red-600">{workflow.errorCode || "Workflow failed"}</p>}
        </div>
      )}
    </div>
  );
}
