// The QA brief's "also test yourself" list: comment tool, upload, rotate, snapping guides, pinch zoom, "?" panel.
import { chromium } from "@playwright/test";
const BASE = "http://localhost:3111/miroisdead";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = [];
p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]");
await p.getByTestId("new-blank").click(); await p.waitForSelector("[data-testid=board-editor]"); await p.waitForTimeout(400);
// comment tool: C + click opens a thread, typing posts
await p.keyboard.press("c"); await p.mouse.click(700, 400); await p.waitForTimeout(200); const ta = p.locator("textarea").first(); await ta.fill("Looks good to me"); await ta.press("Enter"); await p.waitForTimeout(200);
console.log("comment pin:", await p.locator("[data-obj]").count(), "| thread text visible:", await p.getByText("Looks good to me").count() > 0);
await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
// upload
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQIW2P8z8DwnwEKGBkYGP4DAAwMAwF+Wk1fAAAAAElFTkSuQmCC", "base64");
await p.getByTestId("upload-input").setInputFiles({ name: "dot.png", mimeType: "image/png", buffer: png }); await p.waitForTimeout(300); console.log("image uploaded:", await p.locator("svg image").count());
await p.keyboard.press("Escape");
// snapping guides: two stickies, drag one near the other's edge, expect a guide line
await p.keyboard.press("n"); await p.mouse.click(400, 650); await p.keyboard.type("a"); await p.keyboard.press("Escape");
await p.keyboard.press("n"); await p.mouse.click(900, 650); await p.keyboard.type("b"); await p.keyboard.press("Escape"); await p.mouse.click(900, 650);
await p.mouse.move(900, 650); await p.mouse.down(); await p.mouse.move(403, 420, { steps: 6 }); await p.waitForTimeout(100);
console.log("snap guides while dragging:", await p.locator("[data-testid=guide], .mi-guide, line[stroke='#E0457B']").count()); await p.mouse.up();
// rotate a shape
await p.keyboard.press("Escape"); await p.mouse.click(1250, 780); await p.keyboard.press("r"); await p.mouse.click(1250, 780); await p.keyboard.press("Escape"); await p.waitForTimeout(400); await p.mouse.click(1250, 780); console.log("rot handles:", await p.getByTestId("handle-rot").count(), "tool:", await p.getByTestId("canvas").getAttribute("data-active-tool")); await p.waitForTimeout(200); const h = await p.getByTestId("handle-rot").boundingBox();
await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await p.mouse.down(); await p.mouse.move(h.x + 200, h.y - 150, { steps: 8 }); await p.mouse.up(); console.log("rotated:", (await p.locator("svg g[data-obj]").last().locator("xpath=..").getAttribute("transform") ?? "").includes("rotate("));
// pinch zoom = ctrl+wheel (trackpad pinch arrives as ctrlKey wheel)
await p.keyboard.press("Escape"); await p.evaluate(() => { const c = document.querySelector("[data-testid=canvas]"); c.dispatchEvent(new WheelEvent("wheel", { deltaY: -50, ctrlKey: true, clientX: 700, clientY: 400, bubbles: true, cancelable: true })); }); await p.waitForTimeout(150); console.log("zoom after pinch:", await p.locator(".mb-zoom").textContent());
// "?" panel
await p.keyboard.press("?"); await p.waitForTimeout(200); console.log("? panel:", await p.locator(".mm-sc-body, .mi-sheet-grid").count()); await p.keyboard.press("Escape");
console.log("errors:", errs.length ? errs : "none"); await b.close();
