"use client";

import { UiText } from "@/components/i18n/UiText";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
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

export function StepBasics({
  form,
}: {
  form: UseFormReturn<CreateAutomationInput>;
}) {
  const { t } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel><UiText text={"Automation Name"} /></FormLabel>
            <FormControl>
              <Input placeholder="e.g., Full Stack Jobs Calgary" {...field} />
            </FormControl>
            <FormDescription>
              <UiText text={"A descriptive name to identify this automation"} /></FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="jobBoard"
        render={({ field }) => (
          <FormItem>
            <FormLabel><UiText text={"Job Board"} /></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job board" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="jobspy">LinkedIn · Indeed · HelloWork · Glassdoor</SelectItem>
                <SelectItem value="greenhouse">
                  Greenhouse (company boards)
                </SelectItem>
                <SelectItem value="lever">Lever (company boards)</SelectItem>
                <SelectItem value="ashby">Ashby (company boards)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              <UiText text={"Track specific companies' job boards"} /></FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
