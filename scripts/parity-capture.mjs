import { chromium } from "@playwright/test";
import fs from "fs";
const OUT = process.env.OUT; const pages = JSON.parse(process.env.PAGES);
const b = await chromium.launch({ headless: true });
for (const [w, h, tag] of [[1440, 900, "d"], [390, 844, "m"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, userAgent: w < 500 ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", isMobile: w < 500, hasTouch: w < 500, locale: "en-US" });
  for (const [name, url] of Object.entries(pages)) {
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); await p.waitForTimeout(2500);
      // accept nothing; scroll to load lazies
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } window.scrollTo(0, 0); }); await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${name}-${tag}-top.png` });
      await p.screenshot({ path: `${OUT}/${name}-${tag}-full.png`, fullPage: true });
      const info = await p.evaluate(() => {
        const cs = (el) => { const s = getComputedStyle(el); return { tag: el.tagName, text: (el.innerText || "").slice(0, 80).replace(/\n/g, " "), font: s.fontFamily.split(",")[0], size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, color: s.color, bg: s.backgroundColor, radius: s.borderRadius, pad: s.padding, shadow: s.boxShadow.slice(0, 60), rect: el.getBoundingClientRect().toJSON() }; };
        const els = [...document.querySelectorAll("h1,h2,h3,p,a,button,input,nav,header,footer,section,label")].filter(e => e.getBoundingClientRect().width > 0).slice(0, 400);
        return { title: document.title, height: document.documentElement.scrollHeight, fonts: [...new Set([...document.querySelectorAll("*")].map(e => getComputedStyle(e).fontFamily.split(",")[0]))], els: els.map(cs) };
      });
      fs.writeFileSync(`${OUT}/${name}-${tag}.json`, JSON.stringify(info, null, 1));
      console.log(name, tag, "height", info.height, "fonts", info.fonts.join("|"));
    } catch (e) { console.log("FAIL", name, tag, e.message.slice(0, 200)); }
    await p.close();
  }
  await ctx.close();
}
await b.close();


