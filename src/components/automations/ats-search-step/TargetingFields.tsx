"use client";

import { UiText } from "@/components/i18n/UiText";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { TriangleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getAllJobTitles, createJobTitle } from "@/actions/jobtitle.actions";
import { getAllTags, createTag } from "@/actions/tag.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { createLocation } from "@/actions/job.actions";
import { EntityStringChipInput } from "./EntityStringChipInput";
import type { AtsConfigValue } from "./types";

interface TargetingFieldsProps {
  value: AtsConfigValue;
  onChange: (next: AtsConfigValue) => void;
}

export function TargetingFields({ value, onChange }: TargetingFieldsProps) {
  const { t } = useI18n();
  // Without target titles or keywords there is no signal to rank jobs against,
  // so the relevance floor drops everything and nothing is saved.
  const noSignal =
    (value.targetTitles?.length ?? 0) === 0 &&
    (value.keywords?.length ?? 0) === 0;

  return (
    <>
      <EntityStringChipInput
        label={t("Target job titles")}
        placeholder="e.g., Junior Java Developer, Développeur Java"
        noun="job title"
        values={value.targetTitles ?? []}
        onChange={(next) => onChange({ ...value, targetTitles: next })}
        loadOptions={async () => {
          const res = await getAllJobTitles();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createJobTitle(lbl);
          return res?.id ? res : null;
        }}
      />

      <EntityStringChipInput
        label={t("Keywords / skills")}
        placeholder="e.g., Java, Spring Boot, SQL"
        noun="keyword"
        values={value.keywords ?? []}
        onChange={(next) => onChange({ ...value, keywords: next })}
        loadOptions={async () => {
          const res = await getAllTags();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createTag(lbl);
          return res?.success ? res.data : null;
        }}
      />

      {noSignal && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Add at least one target title or keyword. Without them there is
            nothing to rank jobs against, so this automation will save no
            listings.
          </span>
        </div>
      )}

      <EntityStringChipInput
        label={t("Locations")}
        placeholder="e.g., Paris, Île-de-France"
        noun="location"
        values={value.locations ?? []}
        onChange={(next) => onChange({ ...value, locations: next })}
        loadOptions={async () => {
          const res = await getAllJobLocations();
          return Array.isArray(res) ? res : [];
        }}
        createOption={async (lbl) => {
          const res = await createLocation(lbl);
          return res?.success ? res.data : null;
        }}
      />

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <Label><UiText text={"Only show jobs in these locations"} /></Label>
        <Switch
          checked={!!value.strictLocation}
          disabled={(value.locations ?? []).length === 0}
          onCheckedChange={(checked) =>
            onChange({ ...value, strictLocation: checked })
          }
        />
      </div>
    </>
  );
}
