import { chromium } from "@playwright/test";
const OUT = process.env.OUT, BASE = "http://localhost:3000/miroisdead";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1512, height: 675 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` }); const esc = async () => { await p.keyboard.press("Escape"); await p.waitForTimeout(150); };
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]");
await p.getByTestId("new-brainstorm").click(); await p.waitForSelector("[data-testid=board-editor]"); await p.keyboard.press("Shift+1"); await p.waitForTimeout(500);
await p.getByLabel("Facilitation tools and reactions").click(); await p.waitForTimeout(300); await shot("board-facilitation");
await p.getByLabel("React 🎉").click(); await p.waitForTimeout(400); await shot("board-reaction");
await p.getByRole("menuitem", { name: "Timer", exact: true }).click(); await p.waitForTimeout(300); await shot("board-timer");
await p.getByRole("button", { name: "Start", exact: true }).click(); await p.waitForTimeout(1200); await shot("board-timer-running"); await p.getByLabel("Close").first().click();
await p.getByLabel("Facilitation tools and reactions").click(); await p.getByRole("menuitem", { name: "Voting", exact: true }).click(); await p.waitForTimeout(300); await p.getByRole("button", { name: "Start voting" }).click();
const g = p.locator("svg g[data-obj]"); for (const i of [1, 2, 2, 3]) { const bb = await g.nth(i).boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(100); }
await shot("board-voting"); await p.getByRole("button", { name: "End voting" }).click(); await p.waitForTimeout(300); await shot("board-voting-results");
console.log("done"); await b.close();
