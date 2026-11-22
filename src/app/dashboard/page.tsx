import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import {
  getActivityCalendarData, getActivityDataForPeriod, getJobsActivityForPeriod,
  getJobsActivitySummary, getRecentActivities, getRecentJobs,
} from "@/actions/dashboard.actions";
import { getDailyGoalValues, getGoalStreaks } from "@/actions/dailyGoals.actions";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import DailyGoalsCalendar from "@/components/dashboard/DailyGoalsCalendar";
import JobsActivityCard from "@/components/dashboard/JobsActivityCard";
import JobsApplied from "@/components/dashboard/JobsAppliedCard";
import RecentCardToggle from "@/components/dashboard/RecentCardToggle";
import WeeklyBarChartToggle from "@/components/dashboard/WeeklyBarChartToggle";
import { AnalyticsHeader } from "@/components/dashboard/AnalyticsHeader";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Vue d’ensemble") };
}

export default async function Dashboard() {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [summary7Days, summary30Days, recentJobs, recentActivities, weeklyData,
    activitiesData, activityCalendarData, dailyGoals, goalStreaks] = await Promise.all([
    getJobsActivitySummary(7), getJobsActivitySummary(30), getRecentJobs(),
    getRecentActivities(), getJobsActivityForPeriod(), getActivityDataForPeriod(),
    getActivityCalendarData(), getDailyGoalValues(today.slice(0, 7)), getGoalStreaks(),
  ]);
  return (
    <div className="analytics-dashboard col-span-3 min-w-0">
      <AnalyticsHeader today={today} />
      <div className="analytics-grid">
        <div className="@container min-w-0 space-y-4">
          <div className="analytics-top-row grid min-w-0 grid-cols-1 gap-4 @2xl:grid-cols-2">
            <JobsApplied />
            <JobsActivityCard data={[{ label: "7d", summary: summary7Days }, { label: "30d", summary: summary30Days }]} />
          </div>
          <WeeklyBarChartToggle charts={[
            { label: "Jobs", data: weeklyData, keys: ["value"], axisLeftLegend: "JOBS APPLIED" },
            { label: "Activities", data: activitiesData.data, keys: activitiesData.keys, groupMode: "stacked", axisLeftLegend: "TIME SPENT (Hours)" },
          ]} />
          <ActivityCalendar years={Object.keys(activityCalendarData)} dataByYear={activityCalendarData} />
        </div>
        <aside className="min-w-0 space-y-4" aria-label="Daily goals">
          <DailyGoalsCalendar today={today} initialData={dailyGoals.success ? dailyGoals.data : null} initialStreaks={goalStreaks.success ? goalStreaks.data : null} />
        </aside>
      </div>
      <div className="mt-4 min-w-0">
        <RecentCardToggle jobs={recentJobs} activities={recentActivities} />
      </div>
    </div>
  );
}
