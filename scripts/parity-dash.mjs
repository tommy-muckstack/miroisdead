import { chromium } from "@playwright/test";
const OUT = process.env.OUT, BASE = "http://localhost:3000/miroisdead";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1512, height: 675 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]"); await p.waitForTimeout(500);
await p.getByTestId("board-card").first().hover(); await p.getByRole("button", { name: "Board options" }).first().click(); await p.waitForTimeout(300); await shot("dashboard-row-menu"); await p.keyboard.press("Escape");
await p.getByRole("button", { name: "Star" }).first().click(); await p.locator(".mx-side nav a", { hasText: "Starred" }).click(); await p.waitForTimeout(300); await shot("dashboard-starred");
console.log("done"); await b.close();
