"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { UiText } from "@/components/i18n/UiText";
import type { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateAutomationInput } from "@/models/automation.schema";
import { HOURS } from "./wizardConfig";

export function StepSchedule({
  form,
  takenHours,
}: {
  form: UseFormReturn<CreateAutomationInput>;
  takenHours: Set<number>;
}) {
  const { t } = useI18n();
  const board = form.watch("jobBoard");
  const hourly = form.watch(`sourceConfig.${board}.intervalHours`) === 1;
  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-2 text-sm">{t("discovery.frequency")}
        <select className="rounded-md border p-2 bg-background" value={hourly ? "1" : "24"} onChange={(e) => form.setValue(`sourceConfig.${board}.intervalHours`, Number(e.target.value) as 1 | 24, { shouldDirty: true })}>
          <option value="1">{t("discovery.hourly")}</option><option value="24">{t("discovery.daily")}</option>
        </select>
      </label>
      {hourly ? <p className="text-sm text-muted-foreground">{t("discovery.hourlyHint")}</p> : <FormField
      control={form.control}
      name="scheduleHour"
      render={({ field }) => (
        <FormItem>
          <FormLabel><UiText text={"Daily Run Time"} /></FormLabel>
          <Select
            onValueChange={(val) => {
              field.onChange(parseInt(val));
              form.clearErrors("scheduleHour");
            }}
            value={field.value.toString()}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour.value} value={hour.value.toString()}>
                  {hour.label}
                  {takenHours.has(hour.value) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      <UiText text={"In use"} /></span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            <UiText text={"The automation will run daily at this time (server timezone)"} /></FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />}
    </div>
  );
}
