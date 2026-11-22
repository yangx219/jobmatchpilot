import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3737";
assert.match(new URL(baseURL).hostname, /^(localhost|127\.0\.0\.1)$/);
const db = new PrismaClient();
let user, browser;
const createdStatuses = [];
try {
  user = await db.user.create({ data: { name: "Discovery Démo", email: `discovery-${randomUUID()}@example.invalid`, password: "disabled-ui-fixture" } });
  const profile = await db.profile.create({ data: { userId: user.id } });
  const resume = await db.resume.create({ data: { profileId: profile.id, title: "Temporary discovery fixture" } });
  const company = await db.company.create({ data: { label: "Entreprise de démonstration", value: "discovery-fixture", createdBy: user.id } });
  const title = await db.jobTitle.create({ data: { label: "Développeuse Java Junior", value: "java-fixture", createdBy: user.id } });
  const secondTitle = await db.jobTitle.create({ data: { label: "Full Stack Developer", value: "fullstack-fixture", createdBy: user.id } });
  const statuses = {};
  for (const value of ["draft", "applied", "new"]) {
    let status = await db.jobStatus.findUnique({ where: { value } });
    if (!status) { status = await db.jobStatus.create({ data: { label: value, value } }); createdStatuses.push(status.id); }
    statuses[value] = status.id;
  }
  const automation = await db.automation.create({ data: { userId: user.id, resumeId: resume.id, name: "Veille Java (démo)", keywords: "Java", location: "Paris", jobBoard: "greenhouse", sourceConfig: JSON.stringify({ greenhouse: { companies: [{ name: "Fixture", token: "fixture" }], intervalHours: 1, analyzeWithAi: false } }), scheduleHour: 8, status: "paused" } });
  const createJob = (jobTitleId, suffix) => db.job.create({ data: { userId: user.id, companyId: company.id, jobTitleId, statusId: statuses.draft, description: "<p>Java Spring Boot · SQL · Exemple temporaire, pas une véritable offre.</p>", jobUrl: `https://example.invalid/jobs/${suffix}`, jobType: "FT", createdAt: new Date(), discoveredAt: new Date(), automationId: automation.id, discoveryStatus: "new" } });
  const job = await createJob(title.id, "java"); await createJob(secondTitle.id, "fullstack");
  const token = await encode({ secret: process.env.AUTH_SECRET, salt: "authjs.session-token", token: { id: user.id, sub: user.id, name: user.name, email: user.email }, maxAge: 600 });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "authjs.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage(); const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/dashboard/discover`);
  await page.getByRole("heading", { name: "Offres découvertes", exact: true }).waitFor();
  assert.equal(await page.getByTestId("discovery-card").count(), 2);
  const original = page.locator(`a[href="https://example.invalid/jobs/java"]`);
  assert.equal(await original.getAttribute("target"), "_blank");
  assert.equal((await db.job.findUnique({ where: { id: job.id } })).applied, false);
  await page.getByRole("combobox", { name: "Filtrer par poste" }).selectOption(title.id);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="discovery-card"]').length === 1);
  await page.getByText("Lire la description", { exact: true }).click();
  assert.ok(await page.locator("details[open]").count());
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/discovery-desktop.png", fullPage: true });
  for (const width of [768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth, undefined, { timeout: 5000 });
    await page.screenshot({ path: `test-results/discovery-${width}.png`, fullPage: true });
  }
  for (const [locale, titleText] of [["en", "Job discovery"], ["zh", "岗位发现"], ["fr", "Offres découvertes"]]) {
    await page.locator("header select").first().selectOption(locale);
    await page.getByRole("heading", { name: titleText, exact: true }).waitFor();
  }
  await page.getByRole("button", { name: "Ajouter à mes offres", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Offre ajoutée" }).waitFor();
  let stored = await db.job.findUnique({ where: { id: job.id } });
  assert.equal(stored.discoveryStatus, "accepted"); assert.equal(stored.applied, false);
  await page.getByRole("button", { name: /Ajoutées à mes offres/ }).click();
  await page.getByRole("button", { name: "J’ai postulé", exact: true }).waitFor();
  await page.getByRole("button", { name: "J’ai postulé", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Candidature enregistrée" }).waitFor();
  stored = await db.job.findUnique({ where: { id: job.id } });
  assert.equal(stored.applied, true); assert.ok(stored.appliedDate); assert.equal(stored.statusId, statuses.applied);
  assert.equal(stored.jobUrl, "https://example.invalid/jobs/java");
  assert.equal(await db.job.count({ where: { userId: user.id } }), 2);
  assert.equal(await db.jobStage.count({ where: { jobId: job.id, isCurrent: true } }), 1);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole("link", { name: "Voir mon suivi", exact: true }).click();
  await page.waitForURL(`${baseURL}/dashboard/myjobs/${job.id}`);
  await page.goto(`${baseURL}/dashboard/myjobs`);
  await page.getByText("Développeuse Java Junior", { exact: true }).first().waitFor();
  assert.equal(await page.getByText("Full Stack Developer", { exact: true }).count(), 0, "Unaccepted discoveries should stay outside My jobs");

  // Deterministic collection fixture: mock only the provider run trigger, then
  // persist a real completed run/job to test polling and list refresh.
  await page.goto(`${baseURL}/dashboard/discover`);
  await page.route(`**/api/automations/${automation.id}/run`, async (route) => {
    const run = await db.automationRun.create({ data: { automationId: automation.id, status: "completed", completedAt: new Date(), jobsSaved: 1 } });
    await createJob(title.id, "fresh");
    await db.automation.update({ where: { id: automation.id }, data: { lastRunAt: run.completedAt } });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.getByRole("button", { name: "Collecter maintenant", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Collecte terminée." }).waitFor();
  assert.equal(await page.getByTestId("discovery-card").count(), 2);
  await page.screenshot({ path: "test-results/discovery-collected.png", fullPage: true });
  if (process.env.SMOKE_LIVE_ATS === "1") {
    // Real public ATS request with AI disabled, scoped to this temporary user.
    await db.automation.update({ where: { id: automation.id }, data: { sourceConfig: JSON.stringify({ greenhouse: { companies: [{ name: "Datadog", token: "datadog" }], targetTitles: ["Software Engineer"], locations: ["Paris"], analyzeWithAi: false, intervalHours: 1 } }) } });
    const startedAt = new Date();
    const response = await context.request.post(`${baseURL}/api/automations/${automation.id}/run`);
    assert.equal(response.status(), 200, "Real manual collection endpoint should accept the task");
    let run;
    for (let i = 0; i < 60; i++) {
      run = await db.automationRun.findFirst({ where: { automationId: automation.id, startedAt: { gte: startedAt } }, orderBy: { startedAt: "desc" } });
      if (run && !["running", "cancelling"].includes(run.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.equal(run?.status, "completed", `Live collection status: ${run?.status}; error: ${run?.errorMessage}`);
    assert.ok(run.jobsSearched > 0, "The public ATS returned job listings");
    const updated = await db.automation.findUnique({ where: { id: automation.id } });
    assert.ok(updated.nextRunAt && updated.nextRunAt.getTime() > Date.now());
    assert.ok(updated.nextRunAt.getTime() - Date.now() <= 3_600_000);
    console.log(`PASS: real authenticated manual endpoint, public Greenhouse API, AI disabled; searched ${run.jobsSearched}, saved ${run.jobsSaved}; hourly next run persisted. Temporary data only.`);
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS: discovery cards, role filtering, source links, descriptions, three languages, 375/390/768/1440 layouts, save vs applied, same-row tracking, status timeline, My jobs separation and fixture-backed manual collection polling. Temporary records removed.");
} finally {
  if (browser) await browser.close();
  if (user) {
    await db.jobStage.deleteMany({ where: { Job: { userId: user.id } } });
    await db.job.deleteMany({ where: { userId: user.id } });
    await db.automation.deleteMany({ where: { userId: user.id } });
    await db.resume.deleteMany({ where: { profile: { userId: user.id } } });
    await db.profile.deleteMany({ where: { userId: user.id } });
    await db.jobStageType.deleteMany({ where: { createdBy: user.id } });
    await db.company.deleteMany({ where: { createdBy: user.id } });
    await db.jobTitle.deleteMany({ where: { createdBy: user.id } });
    await db.location.deleteMany({ where: { createdBy: user.id } });
    await db.jobSource.deleteMany({ where: { createdBy: user.id } });
    await db.tag.deleteMany({ where: { createdBy: user.id } });
    await db.userSettings.deleteMany({ where: { userId: user.id } });
    await db.chatConversation.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  for (const id of createdStatuses) if (await db.job.count({ where: { statusId: id } }) === 0) await db.jobStatus.delete({ where: { id } });
  await db.$disconnect();
}
