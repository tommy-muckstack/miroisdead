import { chromium } from "@playwright/test";
const OUT = "/Users/tommykeeley/MuckStack-Projects/Web-Android/miroisdead-parity/qa", BASE = "http://localhost:3111/miroisdead";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 800 } });
p.on("pageerror", e => console.log("pageerror:", e.message)); p.on("dialog", d => console.log("NATIVE DIALOG", d.type()));
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]");
for (let i = 0; i < 2; i++) { await p.getByRole("button", { name: "Board options" }).first().click(); await p.getByRole("menuitem", { name: "Duplicate" }).click(); await p.waitForTimeout(200); }
await p.getByRole("button", { name: "Board options" }).first().click(); await p.waitForTimeout(250); await shot("01-row-menu-after");
// the menu must be on top: clicking the Rename item must open the dialog, not the row behind it
const hit = await p.evaluate(() => { const el = document.querySelector('[role=menuitem]:nth-child(2)'); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + 20, r.top + r.height / 2); return top && (top.closest('[role=menuitem]') === el); });
console.log("menu item is topmost:", hit);
await p.getByRole("menuitem", { name: "Rename" }).click(); await p.waitForTimeout(200); await shot("02-rename-after");
await p.getByLabel("Board name").fill("Sprint planning"); await p.getByRole("button", { name: "Save" }).click(); await p.waitForTimeout(200);
console.log("renamed:", await p.getByTestId("board-card").first().textContent());
await p.getByRole("button", { name: "Board options" }).first().click(); await p.getByRole("menuitem", { name: "Board details" }).click(); await p.waitForTimeout(300); await shot("03-details-after"); await p.keyboard.press("Escape");
await p.getByRole("button", { name: "Board options" }).first().click(); await p.getByRole("menuitem", { name: "Delete" }).click(); await p.waitForTimeout(200); await shot("04-delete-after");
const n = await p.getByTestId("board-card").count(); await p.getByTestId("delete-dialog").getByRole("button", { name: "Delete" }).click(); await p.waitForTimeout(150); console.log("rows before/after delete:", n, await p.getByTestId("board-card").count());
console.log("last opened:", await p.locator(".mx-c").nth(2).textContent());
await b.close();
