import { z } from "zod";

const list = z.array(z.string().trim().min(1).max(80)).max(30);

export const CareerProfileSchema = z.object({
  targetTitles: list.min(1),
  adjacentTitles: list,
  excludedTitleTerms: list,
  coreSkills: list,
  optionalSkills: list,
  locations: list.min(1),
  contractTypes: list.min(1),
  seniority: z.enum(["junior", "mid", "senior", "any"]),
  generatedFromResumeId: z.string().uuid().optional(),
  updatedAt: z.string().datetime(),
});

export type CareerProfileInput = z.infer<typeof CareerProfileSchema>;
