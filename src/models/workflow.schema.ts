import { z } from "zod";

export const AGENT_PROMPT_VERSIONS = {
  jobMatch: "job-match-v1",
  coverLetter: "cover-letter-v1",
  resumeTailor: "resume-tailor-v1",
} as const;

const workflowSubject = {
  jobId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
  force: z.boolean().optional(),
};

export const CreateAgentWorkflowSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("job_match"), ...workflowSubject }).strict(),
  z.object({ type: z.literal("cover_letter"), ...workflowSubject }).strict(),
  z.object({ type: z.literal("resume_tailor"), ...workflowSubject }).strict(),
]);

export type CreateAgentWorkflowInput = z.infer<typeof CreateAgentWorkflowSchema>;
