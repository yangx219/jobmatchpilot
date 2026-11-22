import { shouldRunScheduler } from "@/lib/runtime/processRole";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Local development remains self-contained. Production assigns scheduling
    // to one worker instance so horizontal web replicas cannot all fire the
    // same hourly scan.
    if (!shouldRunScheduler()) return;
    const { syncSchedulerState } = await import("@/lib/scheduler");
    await syncSchedulerState();
  }
}
