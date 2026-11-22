import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Checks a running local instance without creating accounts or changing data.
const baseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3737";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/signup`);
  await page.getByRole("heading", { name: "JobMatchPilot", exact: true }).waitFor();
  await page.getByLabel("Nom complet").waitFor();
  assert.match(await page.title(), /JobMatchPilot/);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/jobmatchpilot-signup-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: "test-results/jobmatchpilot-signup-mobile.png", fullPage: true });
  await page.goto(`${baseURL}/signin`);
  await page.getByRole("heading", { name: "Heureux de vous revoir" }).waitFor();
  await page.goto(`${baseURL}/dashboard`);
  await page.waitForURL("**/signin*");
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS: branded signup/signin, mobile width, protected dashboard; no browser runtime errors.");
} finally {
  await browser.close();
}
