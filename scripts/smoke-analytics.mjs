import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3737";
assert.match(new URL(baseURL).hostname, /^(localhost|127\.0\.0\.1)$/);
const db = new PrismaClient();
let user, browser, createdStatus;
try {
  user = await db.user.create({ data: { name: "Analytics Démo", email: `analytics-${randomUUID()}@example.invalid`, password: "disabled-ui-fixture" } });
  const token = await encode({ secret: process.env.AUTH_SECRET, salt: "authjs.session-token", token: { id: user.id, sub: user.id, name: user.name, email: user.email }, maxAge: 600 });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "authjs.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard`);
  await page.getByRole("heading", { name: "Vue d’ensemble", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Calendrier d’activité", exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".analytics-calendar-canvas svg rect").length >= 365);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  assert.equal(await page.locator(".analytics-header time").getAttribute("datetime"), today);
  const color = await page.locator(".jobmatchpilot-sidebar").evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.equal(color, "rgb(255, 255, 255)", "The sidebar should use the neutral light surface");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/analytics-empty-desktop.png", fullPage: true });

  const company = await db.company.create({ data: { label: "Entreprise de démonstration", value: "analytics-fixture", createdBy: user.id } });
  const title = await db.jobTitle.create({ data: { label: "Développeuse Java Junior", value: "analytics-fixture", createdBy: user.id } });
  let status = await db.jobStatus.findUnique({ where: { value: "applied" } });
  if (!status) { status = await db.jobStatus.create({ data: { label: "Applied", value: "applied" } }); createdStatus = status.id; }
  await db.job.create({ data: { userId: user.id, companyId: company.id, jobTitleId: title.id, statusId: status.id, description: "Temporary analytics fixture, not a real vacancy.", jobType: "FT", createdAt: new Date(), applied: true, appliedDate: new Date() } });
  const type = await db.activityType.create({ data: { label: "Préparation technique (démo)", value: "analytics-fixture", createdBy: user.id } });
  await db.activity.create({ data: { userId: user.id, activityTypeId: type.id, activityName: "Préparation de démonstration", startTime: new Date(Date.now() - 45 * 60_000), endTime: new Date(), duration: 45 } });
  await page.reload();
  await page.getByRole("heading", { name: "Candidatures et activité", exact: true }).waitFor();
  await page.getByText("Développeuse Java Junior", { exact: true }).waitFor();
  await page.locator('[data-testid="weekly-chart-toggle-group"]').getByRole("button", { name: "Activités", exact: true }).click();
  await page.getByRole("heading", { name: "Activité sur 7 jours", exact: true }).waitFor();
  await page.locator('[data-testid="weekly-chart-toggle-group"]').getByRole("button", { name: "Offres", exact: true }).click();
  await page.getByRole("heading", { name: "Candidatures sur 7 jours", exact: true }).waitFor();
  await page.waitForTimeout(700); // Let the inherited spring chart transition finish before capturing it.
  await page.getByRole("button", { name: "Mois précédent", exact: true }).first().click();
  await page.getByRole("button", { name: "Mois suivant", exact: true }).first().click();
  await page.waitForFunction(() => document.querySelectorAll(".analytics-calendar-canvas svg rect").length >= 365);
  await page.screenshot({ path: "test-results/analytics-desktop.png", fullPage: true });

  for (const width of [768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    try {
      await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth, undefined, { timeout: 5000 });
    } catch (error) {
      await page.screenshot({ path: `test-results/analytics-overflow-${width}.png`, fullPage: true });
      console.log(await page.evaluate(() => Array.from(document.querySelectorAll("body *")).map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 120), right: element.getBoundingClientRect().right, text: element.textContent?.slice(0, 45) })).filter((element) => element.right > window.innerWidth + 1).slice(-12)));
      throw error;
    }
    await page.waitForTimeout(400); // ResizeObserver and chart springs settle after the viewport changes.
    if (width <= 768) {
      const ticks = await page.locator('[data-testid="weekly-chart-card"] svg text').allTextContents();
      assert.equal(ticks.some((tick) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat),/.test(tick)), false, "Narrow chart containers should use compact date ticks");
    }
    const scroll = page.locator(".analytics-calendar-scroll");
    if (width < 640) {
      assert.ok(await scroll.evaluate((element) => element.scrollWidth > element.clientWidth));
      await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      assert.ok(await scroll.evaluate((element) => element.scrollLeft > 0));
    }
    await page.screenshot({ path: `test-results/analytics-${width}.png`, fullPage: true });
  }
  for (const [locale, title] of [["en", "Weekly Jobs"], ["zh", "近 7 天投递趋势"], ["fr", "Candidatures sur 7 jours"]]) {
    await page.locator("header select").selectOption(locale);
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    const labels = await page.locator('.daily-goals-calendar dl dt [class~="gcx:truncate"]').evaluateAll((nodes) => nodes.map((node) => ({ text: node.textContent, whiteSpace: getComputedStyle(node).whiteSpace, overflow: getComputedStyle(node).textOverflow })));
    assert.ok(labels.length >= 4);
    assert.equal(labels.some((label) => label.whiteSpace === "nowrap" || label.overflow === "ellipsis"), false, "Goal statistic labels should wrap in every locale");
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth, undefined, { timeout: 5000 });
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS: restored analytics, real fixture data, yearly heatmap, Paris date, monthly navigation, chart tabs, white sidebar, three locales and 375/390/768/1440 responsive widths. Temporary data removed.");
} finally {
  if (browser) await browser.close();
  if (user) {
    await db.activity.deleteMany({ where: { userId: user.id } });
    await db.activityType.deleteMany({ where: { createdBy: user.id } });
    await db.job.deleteMany({ where: { userId: user.id } });
    await db.company.deleteMany({ where: { createdBy: user.id } });
    await db.jobTitle.deleteMany({ where: { createdBy: user.id } });
    await db.userSettings.deleteMany({ where: { userId: user.id } });
    await db.chatConversation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  if (createdStatus && await db.job.count({ where: { statusId: createdStatus } }) === 0) await db.jobStatus.delete({ where: { id: createdStatus } });
  await db.$disconnect();
}
