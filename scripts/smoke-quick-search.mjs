import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";
const baseURL = "http://127.0.0.1:3737";
const db = new PrismaClient();
let user, browser;
try {
  user = await db.user.create({ data: { name: "Quick search fixture", email: `quick-${randomUUID()}@example.invalid`, password: "disabled-fixture" } });
  const profile = await db.profile.create({ data: { userId: user.id } });
  await db.resume.create({ data: { profileId: profile.id, title: "CV Java fixture" } });
  const token = await encode({ secret: process.env.AUTH_SECRET, salt: "authjs.session-token", token: { id: user.id, sub: user.id, name: user.name, email: user.email }, maxAge: 600 });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await context.addCookies([{ name: "authjs.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }, { name: "jobmatchpilot-language", value: "zh", url: baseURL }]);
  const page = await context.newPage(); const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard/discover`);
  await page.getByRole("heading", { name: "搜索新岗位", exact: true }).waitFor();
  await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
  await page.getByRole("button", { name: /Search companies/ }).click();
  await page.getByPlaceholder("Search or browse companies...").fill("Datadog");
  await page.getByRole("option", { name: /Datadog/i }).first().click();
  await page.keyboard.press("Escape");
  await page.route("**/api/automations/*/run", async (route) => {
    const id = route.request().url().split("/").at(-2);
    await db.automationRun.create({ data: { automationId: id, status: "completed", completedAt: new Date(), jobsSaved: 0 } });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.getByRole("button", { name: "创建搜索并立即拉取", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "采集完成" }).waitFor();
  const automation = await db.automation.findFirst({ where: { userId: user.id } });
  assert.ok(automation);
  const config = JSON.parse(automation.sourceConfig).greenhouse;
  assert.equal(config.intervalHours, 1); assert.equal(config.analyzeWithAi, false);
  assert.deepEqual(config.targetTitles, ["Junior Java Developer"]);
  assert.deepEqual(config.keywords, ["Java", "Spring Boot", "SQL"]);
  assert.deepEqual(config.locations, ["Paris"]);
  assert.equal(config.companies[0].token, "datadog");
  assert.equal(await db.automation.count({ where: { userId: user.id } }), 1);
  await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
  await page.screenshot({ path: "test-results/quick-search-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS: Chinese mobile quick search, real task creation, selected company, hourly AI-free criteria, single manual trigger and completion refresh. Provider trigger mocked; temporary records removed.");
} finally {
  if (browser) await browser.close();
  if (user) {
    await db.job.deleteMany({ where: { userId: user.id } });
    await db.automation.deleteMany({ where: { userId: user.id } });
    await db.resume.deleteMany({ where: { profile: { userId: user.id } } });
    await db.profile.deleteMany({ where: { userId: user.id } });
    await db.userSettings.deleteMany({ where: { userId: user.id } });
    await db.chatConversation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  await db.$disconnect();
}
