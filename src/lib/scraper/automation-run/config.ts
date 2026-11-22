import { directoryBatch } from "../ats/directory";
import { APP_CONSTANTS } from "@/lib/constants";
import type { JobBoard } from "@/models/automation.model";

export interface AtsRunConfig {
  excludedTitleTerms?: string[];
  companies: { name: string; token: string; host?: "default" | "eu" }[];
  targetTitles: string[];
  keywords: string[];
  locations: string[];
  strictLocation: boolean;
  topK: number;
  saveUnanalyzed: boolean;
  analyzeWithAi: boolean;
}

export function parseAtsConfig(
  sourceConfig: string | null | undefined,
  jobBoard: JobBoard,
): AtsRunConfig | null {
  if (!sourceConfig) return null;
  try {
    const parsed = JSON.parse(sourceConfig);
    const cfg = parsed?.[jobBoard];
    if (!cfg || (jobBoard !== "jobspy" && !Array.isArray(cfg.companies))) return null;
    if (jobBoard === "jobspy" && (!Array.isArray(cfg.sites) || !Array.isArray(cfg.searchTerms))) return null;
    return {
      companies: jobBoard === "jobspy" ? cfg.sites.map((site: string) => ({ name: site, token: site })) : cfg.directoryScope ? directoryBatch(jobBoard, new Date(), cfg.directoryPinned ? cfg.companies : []).companies : cfg.companies,
      excludedTitleTerms: Array.isArray(cfg.excludedTitleTerms) ? cfg.excludedTitleTerms : [],
      targetTitles: Array.isArray(cfg.targetTitles) ? cfg.targetTitles : [],
      keywords: Array.isArray(cfg.keywords) ? cfg.keywords : [],
      locations: Array.isArray(cfg.locations) ? cfg.locations : [],
      strictLocation: !!cfg.strictLocation,
      topK:
        typeof cfg.topK === "number" && cfg.topK > 0
          ? cfg.topK
          : APP_CONSTANTS.MAX_JOBS_PER_RUN,
      saveUnanalyzed: cfg.saveUnanalyzed !== false,
      analyzeWithAi: cfg.analyzeWithAi === true,
    };
  } catch {
    return null;
  }
}
