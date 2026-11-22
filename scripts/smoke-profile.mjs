import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";
const baseURL = "http://127.0.0.1:3737";
const db = new PrismaClient();
let user, browser;
try {
  user = await db.user.create({ data: { name: "Profile fixture", email: `profile-${randomUUID()}@example.invalid`, password: "disabled-fixture" } });
  const token = await encode({ secret: process.env.AUTH_SECRET, salt: "authjs.session-token", token: { id: user.id, sub: user.id, name: user.name, email: user.email }, maxAge: 600 });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "authjs.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }, { name: "jobmatchpilot-language", value: "en", url: baseURL }]);
  const page = await context.newPage(); const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard/profile`);
  await page.getByRole("button", { name: "Add New Resume", exact: true }).waitFor();
  await page.getByRole("button", { name: "Add New Resume", exact: true }).click();
  await page.getByTestId("resume-title-input").fill("CV Java fixture");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: /^CV Java fixture/ }).waitFor();
  const resume = await db.resume.findFirst({ where: { profile: { userId: user.id } } });
  assert.ok(resume, "A resume should be created without an AI key or upload");
  await db.coverLetter.create({ data: { profileId: resume.profileId, title: "Lettre fixture", content: "Temporary demonstration" } });
  await page.reload();
  await page.getByText("Lettre fixture", { exact: true }).waitFor();
  await page.goto(`${baseURL}/dashboard`);
  await page.getByRole("link", { name: "CV & documents", exact: true }).click();
  await page.getByRole("link", { name: /^CV Java fixture/ }).click();
  await page.waitForURL(`${baseURL}/dashboard/profile/resume/${resume.id}`);
  await page.getByText("CV Java fixture", { exact: true }).first().waitFor();
  await page.goto(`${baseURL}/dashboard/profile`);
  await mkdir("test-results", { recursive: true });
  for (const [locale, heading] of [["zh", "我的简历与文档"], ["fr", "Mes CV et documents"], ["en", "My CVs and documents"]]) {
    await page.locator("header select").first().selectOption(locale);
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page.getByRole("link", { name: /^CV Java fixture/ }).waitFor();
  }
  for (const width of [1440, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
    await page.screenshot({ path: `test-results/profile-${width}.png`, fullPage: true });
  }
  await page.goto(`${baseURL}/dashboard/profile/resume/${randomUUID()}`);
  await page.getByRole("heading", { name: "Not found", exact: true }).waitFor();
  assert.deepEqual(errors, [], "No runtime errors on list, navigation, resume editor or missing document");
  console.log("PASS: empty document page, real resume creation without AI, populated list, navigation from dashboard, resume editor, FR/EN/ZH, mobile layouts and missing-resume handling. Temporary account removed.");
} finally {
  if (browser) await browser.close();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { defaultResumeId: null } });
    await db.contactInfo.deleteMany({ where: { resume: { profile: { userId: user.id } } } });
    await db.coverLetter.deleteMany({ where: { profile: { userId: user.id } } });
    await db.resume.deleteMany({ where: { profile: { userId: user.id } } });
    await db.profile.deleteMany({ where: { userId: user.id } });
    await db.userSettings.deleteMany({ where: { userId: user.id } });
    await db.chatConversation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  await db.$disconnect();
}
