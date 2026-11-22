"use server";

import prisma from "@/lib/db";
import { requireUser } from "@/actions/shared";
import { handleError } from "@/lib/utils";
import { CareerProfileSchema, type CareerProfileInput } from "@/models/careerProfile.schema";
import { defaultUserSettings, type UserSettingsData } from "@/models/userSettings.model";

const DEFAULT_EXCLUSIONS = [
  "Senior", "Lead", "Staff", "Principal", "Architect", "Manager",
  "Director", "Head", "Stage", "Intern", "Alternance", "Alternant",
  "Apprentice", "Commercial", "Sales", "Pre-Sales", "Customer Success",
  "Account Executive", "Recruiter", "Product Manager", "Chef de projet",
];

function unique(values: string[]): string[] {
  return [...new Map(values.filter(Boolean).map((value) => [value.toLowerCase(), value])).values()];
}

async function persist(userId: string, careerProfile: CareerProfileInput) {
  const row = await prisma.userSettings.findUnique({ where: { userId } });
  const current = row ? JSON.parse(row.settings) as Partial<UserSettingsData> : {};
  const settings: UserSettingsData = {
    ...defaultUserSettings,
    ...current,
    ai: { ...defaultUserSettings.ai, ...current.ai },
    display: { ...defaultUserSettings.display, ...current.display },
    careerProfile,
  };
  await prisma.userSettings.upsert({
    where: { userId },
    update: { settings: JSON.stringify(settings) },
    create: { userId, settings: JSON.stringify(settings) },
  });
  return careerProfile;
}

export async function generateCareerProfileFromResume() {
  try {
    const user = await requireUser();
    const owner = await prisma.user.findUnique({ where: { id: user.id }, select: { defaultResumeId: true } });
    if (!owner?.defaultResumeId) throw new Error("Choose a default resume first.");
    const resume = await prisma.resume.findFirst({
      where: { id: owner.defaultResumeId, profile: { userId: user.id } },
      include: {
        ContactInfo: true,
        ResumeSections: { include: { skills: { include: { Tag: true } } } },
      },
    });
    if (!resume) throw new Error("Default resume not found.");
    const settingsRow = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    const savedSettings = settingsRow
      ? JSON.parse(settingsRow.settings) as Partial<UserSettingsData>
      : {};
    const savedProfile = savedSettings.careerProfile;
    const skills = unique(resume.ResumeSections.flatMap((section) => section.skills.map((skill) => skill.Tag.label)));
    const lower = new Set(skills.map((skill) => skill.toLowerCase()));
    const has = (...terms: string[]) => terms.some((term) => lower.has(term.toLowerCase()));
    const targetTitles = has("Java", "Spring Boot", "Spring")
      ? ["Junior Java Developer", "Java Backend Developer", "Software Engineer"]
      : ["Junior Software Engineer", "Backend Developer"];
    const adjacentTitles = [
      ...(has("Vue 3", "Vue", "React", "TypeScript") ? ["Full Stack Developer", "Frontend Developer"] : []),
      ...(has("Python", "Machine Learning", "AI") ? ["AI Engineer", "Machine Learning Engineer"] : []),
    ];
    const preferred = ["Java", "Spring Boot", "Spring", "SQL", "REST", "API REST", "Vue 3", "Vue", "TypeScript", "React"];
    const coreSkills = preferred.filter((skill) => has(skill)).slice(0, 8);
    const profile = CareerProfileSchema.parse({
      targetTitles: unique([...(savedProfile?.targetTitles ?? []), ...targetTitles]),
      adjacentTitles: unique([...(savedProfile?.adjacentTitles ?? []), ...adjacentTitles]),
      excludedTitleTerms: DEFAULT_EXCLUSIONS,
      coreSkills: coreSkills.length ? unique(coreSkills) : skills.slice(0, 8),
      optionalSkills: skills.filter((skill) => !coreSkills.some((core) => core.toLowerCase() === skill.toLowerCase())).slice(0, 12),
      locations: ["Paris", "Île-de-France"],
      contractTypes: ["CDI"],
      seniority: "junior",
      generatedFromResumeId: resume.id,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, data: await persist(user.id, profile) };
  } catch (error) {
    return handleError(error, "Failed to generate career profile.");
  }
}

export async function updateCareerProfile(input: CareerProfileInput) {
  try {
    const user = await requireUser();
    const profile = CareerProfileSchema.parse({ ...input, updatedAt: new Date().toISOString() });
    return { success: true, data: await persist(user.id, profile) };
  } catch (error) {
    return handleError(error, "Failed to update career profile.");
  }
}
