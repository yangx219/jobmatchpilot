import {
  isLikelySoftwareJobTitle,
  isNonDevelopmentJobTitle,
} from "@/lib/scraper/ats/job-family";

describe("job-family quality gate", () => {
  it.each([
    "Account Executive, AI Platform",
    "AI Native Sales Engineer",
    "Business Development Manager - LLM",
    "Customer Success Manager, Generative AI",
    "Ingénieur commercial IA",
  ])("rejects commercial title %s before ranking", (title) => {
    expect(isNonDevelopmentJobTitle(title)).toBe(true);
  });

  it.each([
    "AI Agent Engineer",
    "LLM Application Engineer",
    "Développeuse Java / Spring Boot",
    "Machine Learning Engineer",
  ])("keeps engineering title %s", (title) => {
    expect(isNonDevelopmentJobTitle(title)).toBe(false);
    expect(isLikelySoftwareJobTitle(title)).toBe(true);
  });

  it("does not mistake Salesforce development for a sales role", () => {
    expect(isNonDevelopmentJobTitle("Salesforce Developer")).toBe(false);
    expect(isLikelySoftwareJobTitle("Salesforce Developer")).toBe(true);
  });
});
