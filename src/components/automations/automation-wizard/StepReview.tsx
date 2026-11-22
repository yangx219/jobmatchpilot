"use client";

import { UiText } from "@/components/i18n/UiText";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { APP_CONSTANTS } from "@/lib/constants";
import type { CreateAutomationInput } from "@/models/automation.schema";
import type { AtsConfigValue } from "../AtsSearchStep";
import type { WizardResume } from "./wizardConfig";

export function StepReview({
  formValues,
  atsConfig,
  selectedResume,
}: {
  formValues: CreateAutomationInput;
  atsConfig: AtsConfigValue;
  selectedResume?: WizardResume;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex justify-between">
        <span className="text-muted-foreground"><UiText text={"Name"} /></span>
        <span className="font-medium">{formValues.name || "-"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground"><UiText text={"Job Board"} /></span>
        <span className="font-medium capitalize">
          {formValues.jobBoard || "-"}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground"><UiText text={"Companies"} /></span>
        <span className="font-medium text-right">
          {formValues.jobBoard === "jobspy" ? formValues.sourceConfig?.jobspy?.sites.join(", ") : atsConfig.companies?.length
            ? atsConfig.companies.map((c) => c.name).join(", ")
            : "-"}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground"><UiText text={"Target titles"} /></span>
        <span className="font-medium text-right">
          {atsConfig.targetTitles?.length
            ? atsConfig.targetTitles.join(", ")
            : t("Any")}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground"><UiText text={"Locations"} /></span>
        <span className="font-medium text-right">
          {atsConfig.locations?.length
            ? `${atsConfig.locations.join(", ")}${
                atsConfig.strictLocation ? " (strict)" : ""
              }`
            : t("Any location")}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground"><UiText text={"AI analysis"} /></span>
        <span className="font-medium">{atsConfig.analyzeWithAi ? "Enabled" : "Disabled — collection only"}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground"><UiText text={"AI analysis limit"} /></span>
        <span className="font-medium text-right">
          {atsConfig.analyzeWithAi ? (atsConfig.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN) : "Not applicable"}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground"><UiText text={"Save additional listings"} /></span>
        <span className="font-medium text-right">
          {!atsConfig.analyzeWithAi || atsConfig.saveUnanalyzed !== false ? "Yes" : "No"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground"><UiText text={"Resume"} /></span>
        <span className="font-medium">
          {selectedResume?.title || t("Not selected")}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground"><UiText text={"Match Threshold"} /></span>
        <span className="font-medium">{formValues.matchThreshold ?? 80}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground"><UiText text={"Schedule"} /></span>
        <span className="font-medium">
          {atsConfig.intervalHours === 1 ? t("discovery.hourly") : `${t("discovery.daily")} · ${(formValues.scheduleHour ?? 8).toString().padStart(2, "0")}:00`}
        </span>
      </div>
    </div>
  );
}
