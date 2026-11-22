import { AiProvider } from "./ai.model";
import type { GoalTargetsByMonth } from "./dailyGoals.model";

export interface AiSettings {
  provider: AiProvider;
  model: string | undefined;
}

export interface DisplaySettings {
  theme: "light" | "dark" | "system";
}

export interface GoalSettings {
  targets: GoalTargetsByMonth;
}

export interface CareerProfile {
  targetTitles: string[];
  adjacentTitles: string[];
  excludedTitleTerms: string[];
  coreSkills: string[];
  optionalSkills: string[];
  locations: string[];
  contractTypes: string[];
  seniority: "junior" | "mid" | "senior" | "any";
  generatedFromResumeId?: string;
  updatedAt: string;
}

export interface UserSettingsData {
  ai: AiSettings;
  display: DisplaySettings;
  goals?: GoalSettings;
  careerProfile?: CareerProfile;
}

export interface UserSettings {
  userId: string;
  settings: UserSettingsData;
}

export const defaultUserSettings: UserSettingsData = {
  ai: {
    provider: AiProvider.OLLAMA,
    model: undefined,
  },
  display: {
    theme: "system",
  },
};
