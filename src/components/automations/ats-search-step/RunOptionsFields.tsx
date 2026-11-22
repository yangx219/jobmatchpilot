"use client";

import { UiText } from "@/components/i18n/UiText";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { APP_CONSTANTS } from "@/lib/constants";
import type { AtsConfigValue } from "./types";

interface RunOptionsFieldsProps {
  value: AtsConfigValue;
  onChange: (next: AtsConfigValue) => void;
}

export function RunOptionsFields({ value, onChange }: RunOptionsFieldsProps) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <Label htmlFor="analyze-with-ai"><UiText text={"Analyze matches with AI"} /></Label>
        <Switch id="analyze-with-ai" checked={value.analyzeWithAi === true}
          onCheckedChange={(checked) => onChange({ ...value, analyzeWithAi: checked })} />
      </div>
      <div className="space-y-2">
        <Label>
          {t("run.analysisCount", { count: value.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN })}
        </Label>
        <Slider
          disabled={!value.analyzeWithAi}
          min={1}
          max={APP_CONSTANTS.ATS_LISTING_CAP}
          step={1}
          value={[value.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN]}
          onValueChange={(next) => onChange({ ...value, topK: next[0] })}
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <Label><UiText text={"Save additional relevant listings"} /></Label>
        <Switch
          disabled={!value.analyzeWithAi}
          checked={value.saveUnanalyzed !== false}
          onCheckedChange={(checked) =>
            onChange({ ...value, saveUnanalyzed: checked })
          }
        />
      </div>
    </>
  );
}
