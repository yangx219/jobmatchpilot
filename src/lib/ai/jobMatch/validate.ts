import type { JobMatchResult } from "@/models/ai.schemas";

const recommendationFor = (score: number) =>
  score >= 80 ? "strong match"
    : score >= 65 ? "good match"
      : score >= 50 ? "partial match"
        : "weak match";

export function validateJobMatchResult(result: JobMatchResult) {
  if (!result.scores) return { valid: false as const, error: "missing_scores" };
  if (result.body.trim().length < 50) {
    return { valid: false as const, error: "analysis_too_short" };
  }
  if (result.scores.recommendation !== recommendationFor(result.scores.matchScore)) {
    return { valid: false as const, error: "recommendation_score_mismatch" };
  }
  return { valid: true as const };
}
