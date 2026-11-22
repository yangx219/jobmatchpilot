import { z } from "zod";

export const ResumeTailorOutputSchema = z.object({
  summary: z.string().min(20).max(800),
  suggestions: z.array(z.object({
    section: z.string().min(1).max(80),
    original: z.string().min(5).max(1200),
    proposed: z.string().min(5).max(1600),
    rationale: z.string().min(10).max(600),
    keywords: z.array(z.string().min(1).max(80)).max(12),
  })).min(1).max(8),
}).strict();

export type ResumeTailorOutput = z.infer<typeof ResumeTailorOutputSchema>;
