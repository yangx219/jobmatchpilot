import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3737";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir("test-results", { recursive: true });
  await page.goto(baseURL);
  assert.equal(new URL(page.url()).pathname, "/", "Public homepage must not redirect to registration");
  await page.getByRole("heading", { level: 1 }).filter({ hasText: "Votre prochain poste." }).waitFor();
  await page.screenshot({ path: "test-results/jobmatchpilot-home-fr.png", fullPage: true });
  await page.getByRole("tab", { name: "En préparation" }).click();
  await page.getByText("Relire mon CV pour ce poste").waitFor();
  for (const [locale, language, title] of [["en", "en", "Your next role."], ["zh", "zh-CN", "下一份理想工作，"], ["fr", "fr", "Votre prochain poste."]]) {
    await page.locator(".landing-nav select").selectOption(locale);
    await page.getByRole("heading", { level: 1 }).filter({ hasText: title }).waitFor();
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("lang"), language);
    await page.getByRole("heading", { level: 1 }).filter({ hasText: title }).waitFor();
    const html = await (await context.request.get(baseURL)).text();
    assert.ok(html.includes(title), "Server-rendered page must honour the language cookie");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${locale} mobile overflow`);
    await page.screenshot({ path: `test-results/jobmatchpilot-home-${locale}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `test-results/jobmatchpilot-home-${locale}.png`, fullPage: true });
  }
  await page.locator(".landing-nav select").selectOption("en");
  await page.goto(`${baseURL}/signin`);
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await page.getByLabel("Password", { exact: true }).waitFor();
  await page.locator(".auth-language-bar select").selectOption("zh");
  await page.getByLabel("密码", { exact: true }).waitFor();
  await page.goto(`${baseURL}/signup`);
  await page.getByLabel("姓名", { exact: true }).waitFor();
  await page.getByRole("link", { name: "首页" }).click();
  await page.waitForURL(`${baseURL}/`);
  assert.equal(new URL(page.url()).pathname, "/");
  await page.getByRole("heading", { level: 1 }).filter({ hasText: "下一份理想工作" }).waitFor();
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS: public homepage, demo interaction, FR/EN/ZH switching, cookie persistence, server rendering, localized auth, mobile widths and home navigation.");
} finally { await browser.close(); }
