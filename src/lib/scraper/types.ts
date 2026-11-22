export interface JobDetails {
  sourceBoard?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedDate?: string;
  postedDatePrecision?: "day" | "timestamp";
  postedDateKind?: "first" | "last" | "platform" | "posted";
  salary?: string;
  employmentType?: string;
  isRemote?: boolean;
  workplaceType?: string;
}

export type ScraperError =
  | { type: "blocked"; reason: string }
  | { type: "rate_limited"; retryAfter?: number }
  | { type: "network"; message: string }
  | { type: "parse"; message: string };

export type ScraperResult<T> =
  | { success: true; data: T; warnings?: ScraperError[] }
  | { success: false; error: ScraperError };
