export function automationIntervalHours(sourceConfig?: string | object | null): 1 | 24 {
  try {
    const config = typeof sourceConfig === "string" ? JSON.parse(sourceConfig) : sourceConfig;
    return ["greenhouse", "lever", "ashby", "jobspy"].some((board) => config?.[board]?.intervalHours === 1) ? 1 : 24;
  } catch { return 24; }
}

export function calculateNextRunAt(scheduleHour: number, sourceConfig?: string | object | null): Date {
  const now = new Date();
  const next = new Date();

  if (automationIntervalHours(sourceConfig) === 1) {
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  next.setHours(scheduleHour, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export function isAutomationDue(nextRunAt: Date | null): boolean {
  if (!nextRunAt) return false;
  return new Date() >= nextRunAt;
}
