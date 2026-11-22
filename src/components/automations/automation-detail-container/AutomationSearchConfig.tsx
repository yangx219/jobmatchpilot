"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { UiText } from "@/components/i18n/UiText";
import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobBoard, LeverSourceConfig } from "@/models/automation.model";
import { companyBoardUrl } from "@/lib/atsBoardUrl";
import { APP_CONSTANTS } from "@/lib/constants";

// Pure JSON parse (no runner dependency — this is a client component, and
// runner.ts pulls the network-calling scraper into the client bundle). The raw
// parse may be missing any field, so it's a Partial of the config shape.
function parseAtsConfig(
  sourceConfig: string | null | undefined,
  jobBoard: JobBoard,
): Partial<LeverSourceConfig> | null {
  if (!sourceConfig) return null;
  try {
    return JSON.parse(sourceConfig)?.[jobBoard] ?? null;
  } catch {
    return null;
  }
}

interface AutomationSearchConfigProps {
  sourceConfig: string | null | undefined;
  jobBoard: JobBoard;
  retired: boolean;
}

export function AutomationSearchConfig({
  sourceConfig,
  jobBoard,
  retired,
}: AutomationSearchConfigProps) {
  const { t } = useI18n();
  const [showSearchConfig, setShowSearchConfig] = useState(false);

  const greenhouseConfig = retired
    ? null
    : parseAtsConfig(sourceConfig, jobBoard);

  if (!greenhouseConfig) return null;
  if (jobBoard === "jobspy") {
    let cfg: { sites?: string[]; searchTerms?: string[] } = {};
    try { cfg = JSON.parse(sourceConfig ?? "{}").jobspy ?? {}; } catch {}
    return <div className="mt-4 text-sm space-y-2"><p>{cfg.sites?.join(" · ")}</p><p>{cfg.searchTerms?.join(" · ")}</p></div>;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 -ml-2 text-muted-foreground"
        onClick={() => setShowSearchConfig((prev) => !prev)}
      >
        {showSearchConfig ? (
          <ChevronUp className="h-4 w-4 mr-1" />
        ) : (
          <ChevronDown className="h-4 w-4 mr-1" />
        )}
        {showSearchConfig ? "Show less" : "Show more"}
      </Button>

      {showSearchConfig && (
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-4">
            <p className="text-sm text-muted-foreground"><UiText text={"Companies"} /></p>
            {greenhouseConfig.directoryScope ? <p className="text-sm">{t("coverage.directoryHint")}</p> : greenhouseConfig.companies?.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {greenhouseConfig.companies.map((c) => (
                  <Badge key={c.token} variant="secondary" className="gap-1">
                    {c.name}
                    <a
                      href={companyBoardUrl(jobBoard, c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${c.name} job board`}
                      title="Open job board"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium">-</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground"><UiText text={"Target titles"} /></p>
            <p className="text-sm font-medium">
              {greenhouseConfig.targetTitles?.length
                ? greenhouseConfig.targetTitles.join(", ")
                : "Any"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground"><UiText text={"Keywords"} /></p>
            <p className="text-sm font-medium">
              {greenhouseConfig.keywords?.length
                ? greenhouseConfig.keywords.join(", ")
                : "None"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground"><UiText text={"Locations"} /></p>
            <p className="text-sm font-medium">
              {greenhouseConfig.locations?.length
                ? `${greenhouseConfig.locations.join(", ")}${
                    greenhouseConfig.strictLocation ? " (strict)" : ""
                  }`
                : "Any location"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              <UiText text={"AI analysis"} /></p>
            <p className="text-sm font-medium">
              {greenhouseConfig.analyzeWithAi ? `Enabled (up to ${greenhouseConfig.topK ?? APP_CONSTANTS.MAX_JOBS_PER_RUN} jobs)` : "Disabled — collection only"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Extra listings</p>
            <p className="text-sm font-medium">
              {!greenhouseConfig.analyzeWithAi || greenhouseConfig.saveUnanalyzed !== false
                ? "Saved"
                : "Not saved"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
