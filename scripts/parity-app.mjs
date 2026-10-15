// Clone in-app captures (demo account) at the same viewport as the Chrome captures of the original. OUT=dir BASE=url W H
import { chromium } from "@playwright/test";
const OUT = process.env.OUT, BASE = process.env.BASE ?? "http://localhost:3000/miroisdead", W = +(process.env.W ?? 1512), H = +(process.env.H ?? 675);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(`${BASE}/login`); await p.getByText("Use the demo account").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]"); await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/dashboard.png` });
await p.getByTestId("create-menu").click(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/dashboard-create.png` }); await p.keyboard.press("Escape");
await p.getByRole("button", { name: "Account" }).click(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/dashboard-profile.png` }); await p.keyboard.press("Escape");
await p.mouse.click(700, 250); await p.waitForTimeout(200); await p.getByTestId("create-menu").click(); await p.getByText("Explore templates").click(); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/templates-modal.png` }); await p.keyboard.press("Escape"); await p.mouse.click(5, 5);
await p.getByTestId("new-blank").click(); await p.waitForSelector("[data-testid=board-editor]"); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/board-blank.png` });
await p.keyboard.press("n"); const r = await p.getByTestId("canvas").boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.keyboard.type("Hello"); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/board-sticky-selected.png` });
await p.getByTestId("share").click(); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/share.png` }); await p.keyboard.press("Escape");
await p.getByLabel("Shapes and lines").click(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/board-shapes-flyout.png` }); await p.keyboard.press("Escape");
await p.keyboard.press("?"); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/board-shortcuts.png` });
console.log("done"); await b.close();
