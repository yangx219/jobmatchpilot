import { parseAtsConfig } from "@/lib/scraper/automation-run/config";
import { SourceConfigSchema } from "@/models/automation.schema";

describe("OfferFlow AI opt-in", () => {
  it.each(["greenhouse", "lever", "ashby"] as const)("defaults %s to collection only and preserves explicit opt-in", (board) => {
    const source = { [board]: { companies: [{ name: "Acme", token: "acme" }] } };
    expect(parseAtsConfig(JSON.stringify(source), board)?.analyzeWithAi).toBe(false);
    const enabled = { [board]: { ...source[board], analyzeWithAi: true } };
    const validated = SourceConfigSchema.parse(enabled);
    expect(parseAtsConfig(JSON.stringify(validated), board)?.analyzeWithAi).toBe(true);
  });
});
