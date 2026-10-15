import { chromium } from "@playwright/test";
const OUT = "/Users/tommykeeley/MuckStack-Projects/Web-Android/miroisdead-parity/qa", BASE = "http://localhost:3111/miroisdead";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]"); await p.waitForTimeout(400);
console.log("greeting:", await p.locator(".mx-hello").textContent(), "| wraps:", await p.locator(".mx-hello").evaluate(e => e.scrollHeight > e.clientHeight + 4));
console.log("strip cards:", await p.locator(".mx-tpls .mx-tpl").count(), "| verse link:", await p.locator(".mx-tpl-verse").count(), "| list icon:", await p.locator(".mx-bicon").count()); await shot("01-dashboard-after");
await p.getByTestId("create-menu").click(); await p.waitForTimeout(150); await shot("05-create-menu-after"); const over = await p.locator(".mx-cr a").last().evaluate(e => e.scrollWidth > e.clientWidth); console.log("create last item overflows:", over);
await p.getByRole("menuitem", { name: "Explore MiroIsDeadverse" }).click(); await p.waitForTimeout(400); console.log("modal:", await p.getByTestId("templates-modal").count(), "cards:", await p.locator(".mx-tm-card").count()); await shot("06-explore-templates-after");
await p.keyboard.press("Escape"); await p.waitForTimeout(150); console.log("after Escape: modal", await p.getByTestId("templates-modal").count(), "scrim", await p.locator(".mx-scrim").count());
const bb = await p.getByTestId("new-blank").boundingBox(); const top = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[data-testid=new-blank]") !== null, [bb.x + 20, bb.y + 20]); console.log("Blank board clickable:", top);
for (const t of ["kanban", "mindmap", "swot", "okr", "storymap", "weekly"]) { await p.getByTestId(`new-${t}`).click(); await p.waitForSelector("[data-testid=board-editor]"); await p.waitForTimeout(300); console.log(t, "objects:", await p.locator("[data-obj]").count()); await p.screenshot({ path: `${OUT}/tpl-${t}.png` }); await p.goto(`${BASE}/app`); await p.waitForSelector("[data-testid=board-card]"); }
await b.close();
