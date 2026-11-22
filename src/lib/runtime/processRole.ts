export type ProcessRole = "all" | "web" | "worker";

export function processRole(
  value = process.env.JOBMATCHPILOT_PROCESS_ROLE ?? process.env.ROLEMORA_PROCESS_ROLE,
): ProcessRole {
  const role = value || "all";
  if (role === "all" || role === "web" || role === "worker") return role;
  throw new Error(`Invalid JOBMATCHPILOT_PROCESS_ROLE: ${role}`);
}

export function shouldRunScheduler(
  value = process.env.JOBMATCHPILOT_PROCESS_ROLE ?? process.env.ROLEMORA_PROCESS_ROLE,
) {
  return processRole(value) !== "web";
}
