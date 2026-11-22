import { automationIntervalHours, calculateNextRunAt } from "@/lib/scraper/schedule";

afterEach(() => vi.useRealTimers());
it("preserves legacy daily schedules and safely handles malformed config", () => {
  for (const input of [null, undefined, "broken", "{}", { greenhouse: {} }]) expect(automationIntervalHours(input)).toBe(24);
});
it("schedules hourly collection at the next full hour, including midnight", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 31, 23, 37));
  expect(calculateNextRunAt(8, { greenhouse: { intervalHours: 1 } })).toEqual(new Date(2026, 10, 1, 0));
});
it("does not repeat the current full-hour slot", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 31, 10));
  expect(calculateNextRunAt(8, JSON.stringify({ ashby: { intervalHours: 1 } }))).toEqual(new Date(2026, 9, 31, 11));
});
it("retains daily midnight schedules", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 31, 10, 20));
  expect(calculateNextRunAt(0)).toEqual(new Date(2026, 10, 1, 0));
});
