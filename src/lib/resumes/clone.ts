import type { Prisma } from "@prisma/client";
import { resumeCopySelect } from "@/actions/profile/shared";
import { ensureUniqueTitle } from "@/lib/resumeCopyTitle";

export async function cloneResumeInTransaction(tx: Prisma.TransactionClient, userId: string, resumeId: string, desiredTitle: string) {
  const source = await tx.resume.findUnique({ where: { id: resumeId, profile: { userId } }, select: resumeCopySelect });
  if (!source) throw new Error("resume_not_found");
  const existing = await tx.resume.findMany({ where: { profile: { userId } }, select: { title: true } });
  const title = ensureUniqueTitle(desiredTitle, existing.map((item) => item.title));
  const copy = await tx.resume.create({ data: { profileId: source.profileId, title }, select: { id: true, title: true } });
  if (source.ContactInfo) {
    const { id: _id, createdAt: _created, updatedAt: _updated, resumeId: _resume, ...contact } = source.ContactInfo;
    await tx.contactInfo.create({ data: { ...contact, resumeId: copy.id } });
  }
  for (const section of source.ResumeSections) {
    const created = await tx.resumeSection.create({
      data: {
        Resume: { connect: { id: copy.id } },
        sectionTitle: section.sectionTitle,
        sectionType: section.sectionType,
        ...(section.summary ? { summary: { create: { content: section.summary.content } } } : {}),
      },
      select: { id: true },
    });
    if (section.workExperiences.length) await tx.workExperience.createMany({ data: section.workExperiences.map((item) => ({ resumeSectionId: created.id, companyId: item.companyId, jobTitleId: item.jobTitleId, locationId: item.locationId, startDate: item.startDate, endDate: item.endDate, description: item.description, createdAt: item.createdAt })) });
    if (section.educations.length) await tx.education.createMany({ data: section.educations.map((item) => ({ resumeSectionId: created.id, institution: item.institution, degree: item.degree, fieldOfStudy: item.fieldOfStudy, locationId: item.locationId, startDate: item.startDate, endDate: item.endDate, description: item.description, createdAt: item.createdAt })) });
    if (section.licenseOrCertifications.length) await tx.licenseOrCertification.createMany({ data: section.licenseOrCertifications.map((item) => ({ resumeSectionId: created.id, title: item.title, organization: item.organization, issueDate: item.issueDate, expirationDate: item.expirationDate, credentialUrl: item.credentialUrl })) });
    if (section.others.length) await tx.otherSection.createMany({ data: section.others.map((item) => ({ resumeSectionId: created.id, title: item.title, content: item.content, createdAt: item.createdAt })) });
    if (section.skills.length) await tx.skill.createMany({ data: section.skills.map((item) => ({ resumeSectionId: created.id, tagId: item.tagId, category: item.category, order: item.order })) });
  }
  return copy;
}

export async function applyResumeTextReplacement(tx: Prisma.TransactionClient, resumeId: string, original: string, proposed: string) {
  const sections = await tx.resumeSection.findMany({
    where: { resumeId },
    include: { summary: true, workExperiences: true, educations: true, others: true },
    orderBy: { id: "asc" },
  });
  for (const section of sections) {
    if (section.summary?.content.includes(original)) {
      await tx.summary.update({ where: { id: section.summary.id }, data: { content: section.summary.content.replace(original, proposed) } });
      return;
    }
    for (const item of section.workExperiences) if (item.description.includes(original)) {
      await tx.workExperience.update({ where: { id: item.id }, data: { description: item.description.replace(original, proposed) } });
      return;
    }
    for (const item of section.educations) if (item.description?.includes(original)) {
      await tx.education.update({ where: { id: item.id }, data: { description: item.description.replace(original, proposed) } });
      return;
    }
    for (const item of section.others) if (item.content.includes(original)) {
      await tx.otherSection.update({ where: { id: item.id }, data: { content: item.content.replace(original, proposed) } });
      return;
    }
  }
  throw new Error("approved_original_not_found");
}
