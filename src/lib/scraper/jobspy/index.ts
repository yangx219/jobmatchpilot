import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { z } from "zod";
import { JobSpySourceConfigSchema } from "@/models/automation.schema";
import type { AtsProvider } from "../ats/types";

const Health = z.object({ id: z.string(), status: z.enum(["ok", "empty", "partial", "failed"]), jobCount: z.number().int().nonnegative(), checkedAt: z.string(), message: z.string().nullable().optional() });
const Result = z.object({ sourceHealth: z.array(Health), jobs: z.array(z.object({ title: z.string(), company: z.string(), location: z.string(), description: z.string(), url: z.url(), sourceBoard: z.string(), postedDate: z.string().nullable().optional(), postedDatePrecision: z.enum(["day", "timestamp"]).optional(), postedDateKind: z.enum(["first", "last", "platform", "posted"]).optional(), employmentType: z.string().optional(), isRemote: z.boolean().optional() })), errors: z.array(z.object({ token: z.string(), reason: z.string() })) });
export const searchJobSpy: AtsProvider["search"] = async (_sources, context) => {
  const cfg = JobSpySourceConfigSchema.parse(JSON.parse(context?.sourceConfig ?? "{}").jobspy);
  const root = process.env.JOBMATCHPILOT_PROJECT_ROOT ?? process.cwd();
  const python = process.env.JOBSPY_PYTHON ?? path.join(root, ".venv-jobspy/bin/python");
  const script = path.join(root, "scripts/collectors/jobspy_bridge.py");
  if (!existsSync(python) || !existsSync(script)) return { jobs: [], errors: cfg.sites.map((token) => ({ token, reason: "collector_not_installed" })) };
  return new Promise((resolve) => {
    const child = spawn(python, [script], { stdio: ["pipe", "pipe", "pipe"], env: { NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH, PYTHONUNBUFFERED: "1", LANG: "en_US.UTF-8" } });
    let output = "", stopped = false;
    const fail = (reason: string) => { if (stopped) return; stopped = true; clearTimeout(timer); context?.signal?.removeEventListener("abort", abort); child.kill("SIGKILL"); resolve({ jobs: [], errors: cfg.sites.map((token) => ({ token, reason })) }); };
    const abort = () => fail("cancelled");
    const timer = setTimeout(() => fail("collector_timeout"), 150_000);
    context?.signal?.addEventListener("abort", abort, { once: true });
    if (context?.signal?.aborted) { abort(); return; }
    child.stdout.on("data", (chunk) => { output += chunk; if (output.length > 12_000_000) fail("collector_output_limit"); });
    child.stderr.on("data", () => {}); // drain library logs; structured errors arrive in JSON
    child.on("error", () => fail("collector_start_failed"));
    child.on("close", (code) => {
      if (stopped) return;
      if (code !== 0) { fail("collector_process_failed"); return; }
      try {
        const parsed = Result.parse(JSON.parse(output));
        stopped = true; clearTimeout(timer); context?.signal?.removeEventListener("abort", abort);
        resolve({ jobs: parsed.jobs.filter((job) => ["http:", "https:"].includes(new URL(job.url).protocol)).map((job) => ({ ...job, postedDate: job.postedDate ?? undefined })), errors: parsed.errors, sourceHealth: parsed.sourceHealth.map((source) => ({ ...source, message: source.message ?? undefined })) });
      } catch { fail("collector_invalid_response"); }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(cfg));
  });
};
