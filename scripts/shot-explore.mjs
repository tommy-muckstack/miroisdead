import { chromium } from "@playwright/test";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("console", m => { if (m.type() === "error") console.log("console error:", m.text()); }); p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto("http://localhost:3111/miroisdead/login"); await p.screenshot({ path: "/tmp/m-login.png" });
await p.click("text=Use the demo account"); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]"); await p.waitForTimeout(500); await p.screenshot({ path: "/tmp/m-dash.png" });
await p.click("[data-testid=board-card] a"); await p.waitForSelector("[data-testid=board-editor]"); await p.waitForTimeout(500);
await p.keyboard.press("Shift+1"); await p.waitForTimeout(300); await p.screenshot({ path: "/tmp/m-board.png" });
await b.close();
