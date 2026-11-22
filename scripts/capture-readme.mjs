import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";

const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3737";
assert.match(new URL(baseURL).hostname, /^(localhost|127\.0\.0\.1)$/);

const db = new PrismaClient();
let user;
let browser;
const createdStatusIds = [];

async function status(value, label) {
  const existing = await db.jobStatus.findUnique({ where: { value } });
  if (existing) return existing;
  const created = await db.jobStatus.create({ data: { value, label } });
  createdStatusIds.push(created.id);
  return created;
}

try {
  user = await db.user.create({
    data: {
      name: "Alex Morgan",
      email: "demo@jobmatchpilot.dev",
      password: "disabled-readme-fixture",
    },
  });
  const profile = await db.profile.create({ data: { userId: user.id } });
  const resume = await db.resume.create({
    data: { profileId: profile.id, title: "Full Stack Engineer — CV" },
  });
  const applied = await status("applied", "Applied");
  const draft = await status("draft", "Saved");
  const company = await db.company.create({
    data: { label: "Northstar Labs", value: `northstar-${user.id}`, createdBy: user.id },
  });
  const secondCompany = await db.company.create({
    data: { label: "Atlas Digital", value: `atlas-${user.id}`, createdBy: user.id },
  });
  const location = await db.location.create({
    data: { label: "Paris, France", value: `paris-${user.id}`, createdBy: user.id },
  });
  const titles = await Promise.all([
    ["Full Stack Engineer", "full-stack"],
    ["Java Software Engineer", "java"],
    ["Backend Engineer", "backend"],
  ].map(([label, slug]) => db.jobTitle.create({
    data: { label, value: `${slug}-${user.id}`, createdBy: user.id },
  })));
  const automation = await db.automation.create({
    data: {
      userId: user.id,
      resumeId: resume.id,
      name: "Paris software roles",
      keywords: "Java, Spring Boot, TypeScript",
      location: "Paris",
      jobBoard: "greenhouse",
      sourceConfig: JSON.stringify({ greenhouse: { companies: [], intervalHours: 24, analyzeWithAi: false } }),
      scheduleHour: 8,
      status: "active",
    },
  });
  const now = new Date();
  const jobs = [
    { title: titles[0], company, score: 91, applied: true, statusId: applied.id, days: 0 },
    { title: titles[1], company: secondCompany, score: 86, applied: false, statusId: draft.id, days: 1 },
    { title: titles[2], company, score: 79, applied: false, statusId: draft.id, days: 2 },
  ];
  for (const [index, item] of jobs.entries()) {
    const date = new Date(now.getTime() - item.days * 86_400_000);
    await db.job.create({
      data: {
        userId: user.id,
        companyId: item.company.id,
        jobTitleId: item.title.id,
        locationId: location.id,
        statusId: item.statusId,
        resumeId: resume.id,
        description: "<p>Permanent contract (CDI). Build reliable web products with Java, Spring Boot, TypeScript and PostgreSQL.</p>",
        jobUrl: `https://example.invalid/jobs/readme-${index}`,
        jobType: "CDI",
        workplaceType: index === 1 ? "Hybrid" : "Remote",
        createdAt: date,
        applied: item.applied,
        appliedDate: item.applied ? date : null,
        discoveredAt: date,
        publishedAt: date,
        publicationPrecision: "day",
        publicationKind: "posted",
        automationId: automation.id,
        discoveryStatus: item.applied ? "accepted" : "new",
        matchScore: item.score,
      },
    });
  }
  const activityType = await db.activityType.create({
    data: { label: "Interview preparation", value: `interview-prep-${user.id}`, createdBy: user.id },
  });
  await db.activity.create({
    data: {
      userId: user.id,
      activityTypeId: activityType.id,
      activityName: "System design preparation",
      startTime: new Date(now.getTime() - 55 * 60_000),
      endTime: now,
      duration: 55,
    },
  });

  await mkdir("public/readme", { recursive: true });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const token = await encode({
    secret: process.env.AUTH_SECRET,
    salt: "authjs.session-token",
    token: { id: user.id, sub: user.id, name: user.name, email: user.email },
    maxAge: 600,
  });
  await context.addCookies([
    { name: "jobmatchpilot-language", value: "en", url: baseURL },
    {
      name: "authjs.session-token",
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${baseURL}/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".analytics-calendar-canvas svg rect").length >= 365);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/readme/jobmatchpilot-dashboard-en.png", fullPage: true });

  await page.goto(`${baseURL}/dashboard/discover`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Job discovery", exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/readme/jobmatchpilot-discovery-en.png", fullPage: true });

  await page.goto(`${baseURL}/dashboard/activities`, { waitUntil: "networkidle" });
  await page.getByText("System design preparation", { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/readme/jobmatchpilot-planning-en.png", fullPage: true });

  assert.deepEqual(errors, []);
  console.log("Captured three English README screenshots with temporary data.");
} finally {
  if (browser) await browser.close();
  if (user) {
    await db.activity.deleteMany({ where: { userId: user.id } });
    await db.activityType.deleteMany({ where: { createdBy: user.id } });
    await db.jobStage.deleteMany({ where: { Job: { userId: user.id } } });
    await db.job.deleteMany({ where: { userId: user.id } });
    await db.automation.deleteMany({ where: { userId: user.id } });
    await db.resume.deleteMany({ where: { profile: { userId: user.id } } });
    await db.profile.deleteMany({ where: { userId: user.id } });
    await db.company.deleteMany({ where: { createdBy: user.id } });
    await db.jobTitle.deleteMany({ where: { createdBy: user.id } });
    await db.location.deleteMany({ where: { createdBy: user.id } });
    await db.userSettings.deleteMany({ where: { userId: user.id } });
    await db.chatConversation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  for (const id of createdStatusIds) {
    if (await db.job.count({ where: { statusId: id } }) === 0) {
      await db.jobStatus.delete({ where: { id } });
    }
  }
  await db.$disconnect();
}
