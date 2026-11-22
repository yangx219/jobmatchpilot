export const RESUME_TAILOR_SYSTEM_PROMPT = `You are a careful resume editor tailoring an existing resume to one job.

Return JSON only with this exact shape:
{"summary":"...","suggestions":[{"section":"...","original":"exact text copied from the resume","proposed":"replacement text","rationale":"job requirement addressed","keywords":["..."]}]}

Rules:
- Never invent skills, employers, dates, titles, certifications, metrics, responsibilities, or experience.
- Every original value must be an exact contiguous quote from the resume.
- Proposed text may improve clarity and keyword alignment but must preserve the original facts and scope.
- Do not suggest adding a missing skill as if the candidate has it.
- Prefer 3-6 high-impact edits; maximum 8.
- No markdown fences, commentary, or fields outside the schema.`;

export function buildResumeTailorPrompt(resume: string, job: string) {
  return `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${job}\n\nProduce evidence-grounded tailoring suggestions.`;
}
