import { chromium } from "@playwright/test";
const BASE = "http://localhost:3111/miroisdead";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const p = await ctx.newPage(); p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]");
// 1) no share sheet (headless Chromium): Invite members copies the sign-up link
await p.getByRole("button", { name: "Invite members" }).click(); await p.waitForTimeout(200); console.log("toast:", await p.locator(".mx-toast").textContent(), "| clipboard:", await p.evaluate(() => navigator.clipboard.readText()));
// 2) with a share sheet: stub navigator.share and check it receives title/text/url
await p.evaluate(() => { window.__shared = []; navigator.share = d => { window.__shared.push(d); return Promise.resolve(); }; navigator.canShare = () => true; });
await p.getByRole("button", { name: "Invite members" }).click(); await p.waitForTimeout(200); console.log("share sheet got:", JSON.stringify(await p.evaluate(() => window.__shared[0])), "| toast:", await p.locator(".mx-toast").textContent());
await p.getByRole("button", { name: "Board options" }).first().click(); await p.getByRole("menuitem", { name: "Copy board link" }).click(); await p.waitForTimeout(200); console.log("row menu share:", JSON.stringify(await p.evaluate(() => window.__shared[1])));
// 3) board share dialog
await p.getByTestId("board-card").first().locator("a").first().click(); await p.waitForSelector("[data-testid=board-editor]"); await p.waitForTimeout(300);
await p.getByTestId("share").click(); await p.waitForTimeout(200); console.log("share button label (no sheet):", await p.locator(".mb-copy").first().textContent());
await p.locator(".mb-mail input").fill("sam@example.com"); await p.locator(".mb-mail input").press("Enter"); await p.waitForTimeout(250); console.log("invite form → clipboard:", await p.evaluate(() => navigator.clipboard.readText()), "| toast:", await p.locator(".mi-toast, .mb-toast, [role=status]").last().textContent().catch(() => "?"));
await b.close();
