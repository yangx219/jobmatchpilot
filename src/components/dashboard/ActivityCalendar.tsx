"use client";
import { useState } from "react";
import { ResponsiveCalendar } from "@nivo/calendar";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { localeTags } from "@/lib/i18n/core";

export default function ActivityCalendar({ years, dataByYear }: {
  years: string[]; dataByYear: Record<string, { day: string; value: number; hours?: number }[]>;
}) {
  const { t, locale } = useI18n();
  const currentYear = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Paris" }).format(new Date());
  const options = [...new Set([...years, currentYear])].sort();
  const [year, setYear] = useState(options.at(-1) ?? currentYear);
  const { resolvedTheme } = useTheme();
  const data = dataByYear[year] ?? [];
  const hoursMap = Object.fromEntries(data.map((day) => [day.day, day.hours ?? 0]));
  const text = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{t("analytics.heatmap")}</CardTitle>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[90px]" aria-label={t("analytics.year")}><SelectValue /></SelectTrigger>
            <SelectContent>{options.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="analytics-calendar-scroll" role="region" aria-label={t("analytics.heatmap")} tabIndex={0}>
          <div className="analytics-calendar-canvas">
            <ResponsiveCalendar
              data={data} from={`${year}-01-01`} to={`${year}-12-31`}
              emptyColor={resolvedTheme === "dark" ? "#263142" : "#f1f5f9"}
              colors={["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"]}
              minValue={0} margin={{ top: 24, right: 12, bottom: 20, left: 12 }}
              yearSpacing={40} monthBorderColor={resolvedTheme === "dark" ? "#151b26" : "#fff"}
              yearLegend={() => ""}
              dayBorderWidth={2} dayBorderColor={resolvedTheme === "dark" ? "#151b26" : "#fff"}
              monthLegend={(_year, _month, date) => new Intl.DateTimeFormat(localeTags[locale], { month: "short" }).format(date)}
              theme={{ text: { fill: text, fontSize: 10 } }}
              tooltip={(day) => <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"><strong>{new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(day.day + "T12:00:00Z"))}</strong><div>{t("analytics.jobsApplied")}: {day.value}</div><div>{t("analytics.activity")}: {hoursMap[day.day] ?? 0} h</div></div>}
            />
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">{t("analytics.calendarHint")}</p>
      </CardContent>
    </Card>
  );
}
