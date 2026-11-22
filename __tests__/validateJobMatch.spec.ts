import { validateJobMatchResult } from "@/lib/ai/jobMatch/validate";

const body = "A sufficiently detailed evidence-grounded analysis of the candidate and job requirements.";

describe("validateJobMatchResult", () => {
  it.each([
    [82, "strong match"],
    [70, "good match"],
    [55, "partial match"],
    [20, "weak match"],
  ] as const)("accepts score %s with %s", (matchScore, recommendation) => {
    expect(validateJobMatchResult({ scores: { matchScore, recommendation }, body })).toEqual({ valid: true });
  });

  it("rejects a recommendation that contradicts its score", () => {
    expect(validateJobMatchResult({ scores: { matchScore: 35, recommendation: "strong match" }, body })).toEqual({
      valid: false,
      error: "recommendation_score_mismatch",
    });
  });

  it("rejects missing scores and empty analysis", () => {
    expect(validateJobMatchResult({ body })).toMatchObject({ error: "missing_scores" });
    expect(validateJobMatchResult({ scores: { matchScore: 80, recommendation: "strong match" }, body: "Too short" })).toMatchObject({ error: "analysis_too_short" });
  });
});
