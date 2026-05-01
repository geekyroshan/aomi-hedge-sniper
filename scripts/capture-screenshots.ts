/**
 * Capture demo screenshots for the X thread / README / one-pager.
 *
 * Pre-req: dev server running on localhost:3000 in MOCK mode.
 * Run:     pnpm dlx playwright install chromium  (one-time)
 *          tsx scripts/capture-screenshots.ts
 *
 * Outputs: distribution/screenshots/*.png
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = "distribution/screenshots";
const URL = "http://localhost:3000";

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();

  console.log("→ load page");
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "01-empty.png"), fullPage: false });

  console.log("→ type prompt");
  const input = page.getByPlaceholder(/hedge/i);
  await input.click();
  await input.fill("find me a 3%+ hedge under $50");
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, "02-typed.png") });

  console.log("→ submit, wait for plan card");
  await page.getByRole("button", { name: /send/i }).click();
  await page.waitForSelector("text=covering portfolio", { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "03-plan.png") });

  console.log("→ click simulate");
  await page.getByRole("button", { name: /simulate/i }).click();
  await page.waitForSelector("text=Simulation OK", { timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "04-simulated.png") });

  console.log("→ click sign");
  await page.getByRole("button", { name: /sign/i }).click();
  await page.waitForSelector("text=confirmation", { timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "05-signed.png") });

  console.log("→ scoped hero crop of plan card");
  // Match the rounded-xl PlanCard wrapper directly — the only one on the page
  const card = page.locator("div.rounded-xl.border.bg-bg").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  // Crop just the card with a little padding by computing bounding box
  const box = await card.boundingBox();
  if (box) {
    const pad = 24;
    await page.screenshot({
      path: join(OUT, "06-hero-card.png"),
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: Math.min(1440, box.width + pad * 2),
        height: Math.min(900, box.height + pad * 2),
      },
    });
  } else {
    await page.screenshot({ path: join(OUT, "06-hero-card.png") });
  }

  await browser.close();
  console.log("✓ screenshots saved to", OUT);
}

main().catch((e) => {
  console.error("✗ capture failed:", e);
  process.exit(1);
});
