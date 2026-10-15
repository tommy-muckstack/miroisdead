// Viewport-sized segment crops of a page for side-by-side review. OUT=dir PAGES='{"name":"url"}' W=1440 H=900
import { chromium } from "@playwright/test";
import fs from "fs";
const OUT = process.env.OUT, pages = JSON.parse(process.env.PAGES), W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 500, hasTouch: W < 500, userAgent: W < 500 ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" : undefined });
for (const [name, url] of Object.entries(pages)) {
  const p = await ctx.newPage(); await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); await p.waitForTimeout(2000);
  await p.screenshot({ path: `${OUT}/${name}-${W}-s00.png` });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); }); await p.waitForTimeout(600);
  const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, i = 1; y < hgt; y += H, i++) { await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${name}-${W}-s${String(i).padStart(2, "0")}.png` }); }
  console.log(name, W, "segments", Math.ceil(hgt / H)); await p.close();
}
await b.close();
