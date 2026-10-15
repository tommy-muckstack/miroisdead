// Regenerates the marketing screenshots (public/home) and the review shots from the running production build.
// Usage: DEMO_MODE=1 next start -p 3112 & node scripts/shots.mjs
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3112/miroisdead", OUT = "/workspace/miroisdead-shots", HOME = new URL("../public/home/", import.meta.url).pathname;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
p.on("pageerror", e => console.log("pageerror:", e.message)); p.on("console", m => m.type() === "error" && console.log("console error:", m.text()));
const canvasAt = async (x, y) => { const r = await p.getByTestId("canvas").boundingBox(); return { x: r.x + r.width / 2 + x, y: r.y + r.height / 2 + y }; };
const click = async (x, y) => { const a = await canvasAt(x, y); await p.mouse.click(a.x, a.y); };
const drag = async (x1, y1, x2, y2) => { const a = await canvasAt(x1, y1), c = await canvasAt(x2, y2); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(c.x, c.y, { steps: 10 }); await p.mouse.up(); };
const open = async tpl => { await p.goto(`${BASE}/app`); await p.getByTestId(`new-${tpl}`).click(); await p.waitForSelector("[data-testid=board-editor]"); await p.waitForTimeout(500); };
const fit = async () => { await p.keyboard.press("Shift+1"); await p.waitForTimeout(350); };
const shot = async (path) => { await p.mouse.move(700, 880); await p.waitForTimeout(150); await p.screenshot({ path }); console.log("wrote", path); };

await p.goto(`${BASE}/login`); await p.screenshot({ path: `${OUT}/03-login.png` });
await p.getByText("Use the demo account").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]"); await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/04-boards.png` });

for (const [tpl, name] of [["brainstorm", "research"], ["roadmap", "roadmap"], ["flowchart", "diagrams"], ["retro", "workshops"]]) { await open(tpl); await fit(); await shot(`${HOME}${name}.png`); }

await open("welcome"); await fit(); await p.keyboard.press("m"); await p.waitForTimeout(300); await shot(`${HOME}canvas.png`); await shot(`${OUT}/05-board-welcome.png`);
await p.keyboard.press("?"); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/06-shortcuts.png` }); await p.keyboard.press("Escape");

await open("blank");
await p.keyboard.press("n"); await click(-340, -60); await p.keyboard.type("Users want a faster first board"); await p.keyboard.press("Tab"); await p.keyboard.type("Templates cut setup time"); await p.keyboard.press("Escape");
await p.getByTestId("dot-s").click(); await p.keyboard.type("Ship five starters"); await p.keyboard.press("Escape");
await click(-340, -60); await p.getByRole("button", { name: /Sticky colour #FFB8C6/ }).click(); await click(-340 + 204 + 20, -60);
await shot(`${HOME}quick-create.png`); await shot(`${OUT}/07-quick-create-toolbar.png`);

await open("flowchart"); await fit();
const c = await p.locator("svg g[data-obj]").nth(10).locator("path").first().boundingBox(); await p.mouse.click(c.x + c.width / 2, c.y + c.height / 2); await p.waitForTimeout(250);
await shot(`${HOME}connectors.png`);

await open("brainstorm"); await fit();
await p.keyboard.press("-"); await p.waitForTimeout(300); await drag(-520, -270, -60, 130); await p.waitForTimeout(250); await shot(`${HOME}frames.png`); await shot(`${OUT}/08-multiselect-toolbar.png`);

await open("welcome"); await fit();
await p.keyboard.press("p"); await drag(-100, 250, 150, 280); await p.keyboard.press("Escape"); await p.keyboard.press("v");
await shot(`${OUT}/09-pen-and-shapes.png`);

const m = await ctx.newPage(); await m.setViewportSize({ width: 1440, height: 900 });
await m.goto(`${BASE}/`); await m.waitForTimeout(800); await m.screenshot({ path: `${OUT}/01-marketing-top.png` });
await m.screenshot({ path: `${OUT}/02-marketing-full.png`, fullPage: true });
await m.locator("#pricing").scrollIntoViewIfNeeded(); await m.waitForTimeout(500); await m.locator("#pricing").screenshot({ path: `${OUT}/02b-marketing-pricing.png` });
const mob = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await mob.newPage(); await mp.goto(`${BASE}/`); await mp.waitForTimeout(800); await mp.screenshot({ path: `${OUT}/10-marketing-mobile.png` });
await b.close();
