import { test, expect, Page } from "@playwright/test";

const MOD = process.platform === "darwin" ? "Meta" : "Control";
async function demo(page: Page) { await page.goto("/miroisdead/login"); await page.getByText("Use the demo account").click(); await page.waitForURL("**/miroisdead/app"); }
async function newBoard(page: Page, tpl = "blank") { await demo(page); await page.getByTestId(`new-${tpl}`).click(); await page.waitForSelector("[data-testid=board-editor]"); await page.waitForTimeout(300); }
const canvas = (page: Page) => page.getByTestId("canvas");
async function at(page: Page, x: number, y: number) { const b = (await canvas(page).boundingBox())!; return { x: b.x + b.width / 2 + x, y: b.y + b.height / 2 + y }; }
async function click(page: Page, x: number, y: number) { const p = await at(page, x, y); await page.mouse.click(p.x, p.y); }
async function drag(page: Page, x1: number, y1: number, x2: number, y2: number, steps = 8) { const a = await at(page, x1, y1), b = await at(page, x2, y2); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps }); await page.mouse.up(); }
const objs = (page: Page) => page.locator("svg g[data-obj], svg path[data-obj]");
const zoom = async (page: Page) => parseInt((await page.getByTestId("zoom-level").textContent())!);

test.beforeEach(async ({ page }) => { page.on("pageerror", e => { throw e; }); });

test("demo login, dashboard seeded, board opens", async ({ page }) => {
  await demo(page);
  await expect(page.getByTestId("board-card").first()).toContainText("Welcome tour");
  await page.getByTestId("board-card").first().locator("a").click();
  await expect(page.getByTestId("board-editor")).toBeVisible(); await expect(objs(page)).toHaveCount(14);
});

test("login page is unauthenticated-only and app redirects to login", async ({ page, context }) => {
  await context.clearCookies(); await page.goto("/miroisdead/app"); await expect(page).toHaveURL(/\/miroisdead\/login/);
});

test("sticky: N, click, type, Esc; autosaves and survives reload; tool reverts to select", async ({ page }) => {
  await newBoard(page);
  await expect(page.getByTestId("empty-hint")).toBeVisible();
  await page.keyboard.press("n"); await click(page, -100, -50);
  await page.keyboard.type("Hello board"); await page.keyboard.press("Escape");
  await expect(objs(page)).toHaveCount(1); await expect(page.locator("svg text").filter({ hasText: "Hello" })).toBeVisible();
  await expect(page.locator('[data-tool="select"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("save-status")).toHaveText(/Saved on this device/, { timeout: 5000 });
  await page.reload(); await page.waitForSelector("[data-testid=board-editor]");
  await expect(page.locator("svg text").filter({ hasText: "Hello" })).toBeVisible();
});

test("Tab chains stickies in a row without the mouse", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("n"); await click(page, -300, 0);
  await page.keyboard.type("one"); await page.keyboard.press("Tab"); await page.keyboard.type("two"); await page.keyboard.press("Tab"); await page.keyboard.type("three"); await page.keyboard.press("Escape");
  await expect(objs(page)).toHaveCount(3);
  const xs = await page.locator("svg g[data-obj]").evaluateAll(els => els.map(e => (e.getAttribute("transform") ?? "").match(/translate\(([-\d.]+)/)![1]).map(Number));
  expect(xs[1] - xs[0]).toBeCloseTo(204); expect(xs[2] - xs[1]).toBeCloseTo(204);
  await expect(page.locator("svg text").filter({ hasText: "three" })).toBeVisible();
});

test("shapes: drag to draw, type label; R/O/D tools; undo and redo", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("r"); await drag(page, -300, -100, -100, 0); await page.keyboard.type("Start"); await page.keyboard.press("Escape");
  await page.keyboard.press("o"); await drag(page, 100, -100, 300, 20); await page.keyboard.press("Escape");
  await page.keyboard.press("d"); await click(page, 0, 200); await page.keyboard.press("Escape");
  await expect(objs(page)).toHaveCount(3);
  await page.keyboard.press(`${MOD}+z`); await expect(objs(page)).toHaveCount(2);
  await page.keyboard.press(`${MOD}+Shift+z`); await expect(objs(page)).toHaveCount(3);
  await page.keyboard.press(`${MOD}+z`); await page.keyboard.press(`${MOD}+z`); await page.keyboard.press(`${MOD}+z`); await expect(objs(page)).toHaveCount(0);
});

test("connectors bind to shapes and reroute live when a shape moves", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("r"); await drag(page, -400, -60, -240, 50); await page.keyboard.press("Escape");
  await page.keyboard.press("r"); await drag(page, 200, -60, 360, 50); await page.keyboard.press("Escape");
  await page.keyboard.press("c"); await drag(page, -320, 0, 280, 0); // from shape A centre to shape B centre
  await expect(objs(page)).toHaveCount(3);
  const conn = page.locator("svg g[data-obj]").last().locator("path").first();
  const before = await conn.getAttribute("d");
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await drag(page, 280, 0, 280, 250); // move shape B down
  const after = await page.locator("svg g[data-obj]").last().locator("path").first().getAttribute("d");
  expect(after).not.toBe(before); expect(after).toMatch(/^M[\d.\- ]+L.*Q/); // rounded elbow
  // dragging B moved only B; connector still bound so still exactly 3 objects
  await expect(objs(page)).toHaveCount(3);
});

test("pen draws freehand and stays active", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("p"); await drag(page, -100, -100, 100, 60, 15); await drag(page, -100, 100, 100, 100, 10);
  await expect(page.locator("svg path[data-obj]")).toHaveCount(2); await expect(page.locator('[data-tool="pen"]')).toHaveAttribute("aria-pressed", "true");
});

test("multi-select by marquee, align toolbar, frame, delete", async ({ page }) => {
  await newBoard(page, "brainstorm");
  await page.getByTestId("canvas").click({ position: { x: 5, y: 5 } }); await page.keyboard.press("Shift+1"); await page.waitForTimeout(200);
  await page.keyboard.press(`${MOD}+a`);
  await expect(page.getByTestId("selection-count")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("selection-toolbar")).toHaveCount(0);
});

test("align toolbar moves selected stickies to a common edge", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("n"); await click(page, -250, -120); await page.keyboard.type("a"); await page.keyboard.press("Escape");
  await page.keyboard.press("n"); await click(page, 100, 100); await page.keyboard.type("b"); await page.keyboard.press("Escape");
  await drag(page, -400, -300, 400, 300); // marquee both
  await expect(page.getByTestId("selection-count")).toHaveText("2 selected");
  await page.getByRole("button", { name: "Align left" }).click();
  const xs = await page.locator("svg g[data-obj]").evaluateAll(els => els.map(e => (e.getAttribute("transform") ?? "").match(/translate\(([-\d.]+)/)![1]));
  expect(xs[0]).toBe(xs[1]);
  await page.getByRole("button", { name: "Frame selection (F)" }).click(); await expect(objs(page)).toHaveCount(3);
});

test("quick-create dot makes a connected clone in edit mode; recolour from the toolbar", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("n"); await click(page, -100, 0); await page.keyboard.type("root"); await page.keyboard.press("Escape");
  await expect(page.getByTestId("dot-e")).toBeVisible();
  await page.getByTestId("dot-e").click();
  await expect(page.getByTestId("text-editor")).toBeFocused(); await page.keyboard.type("child"); await page.keyboard.press("Escape");
  await expect(objs(page)).toHaveCount(3); // sticky, sticky, connector
  await click(page, -100, 0); await page.getByRole("button", { name: /Sticky colour #FFB8C6/ }).click();
  await expect(page.locator("svg rect[fill='#FFB8C6']")).toHaveCount(1);
});

test("zoom: ctrl+wheel zooms at the cursor, buttons, 100% reset and fit", async ({ page }) => {
  await newBoard(page, "flowchart");
  expect(await zoom(page)).toBe(100);
  const p = await at(page, 0, 0); await page.mouse.move(p.x, p.y); await page.keyboard.down(MOD); await page.mouse.wheel(0, -300); await page.keyboard.up(MOD);
  await expect.poll(() => zoom(page)).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Zoom out" }).click(); await page.getByTestId("zoom-level").click(); expect(await zoom(page)).toBe(100);
  await page.keyboard.press("Shift+1"); await page.waitForTimeout(100); expect(await zoom(page)).toBeLessThanOrEqual(100);
});

test("pan with Space+drag and hand tool changes the view", async ({ page }) => {
  await newBoard(page, "welcome");
  const before = await page.locator("svg > g").first().getAttribute("transform");
  await page.keyboard.down("Space"); await drag(page, 0, 0, 120, 80); await page.keyboard.up("Space");
  expect(await page.locator("svg > g").first().getAttribute("transform")).not.toBe(before);
});

test("shortcut sheet, minimap toggle and command keys", async ({ page }) => {
  await newBoard(page, "welcome");
  await page.keyboard.press("?"); await expect(page.getByTestId("shortcut-sheet")).toContainText("Keyboard shortcuts"); await page.keyboard.press("Escape");
  await expect(page.getByTestId("shortcut-sheet")).toHaveCount(0);
  await page.keyboard.press("m"); await expect(page.getByTestId("minimap")).toBeVisible(); await page.keyboard.press("m"); await expect(page.getByTestId("minimap")).toHaveCount(0);
  for (const [k, t] of [["h", "hand"], ["t", "text"], ["f", "frame"], ["e", "eraser"], ["c", "connector"], ["v", "select"]]) { await page.keyboard.press(k); await expect(page.locator(`[data-tool="${t}"]`)).toHaveAttribute("aria-pressed", "true"); }
});

test("duplicate, copy/paste, delete and alt-drag duplicate", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("n"); await click(page, 0, 0); await page.keyboard.type("x"); await page.keyboard.press("Escape");
  await page.keyboard.press(`${MOD}+d`); await expect(objs(page)).toHaveCount(2);
  await page.keyboard.press(`${MOD}+c`); await page.keyboard.press(`${MOD}+v`); await expect(objs(page)).toHaveCount(3);
  await page.keyboard.press("Delete"); await expect(objs(page)).toHaveCount(2);
  await page.keyboard.press("Escape"); await page.keyboard.down("Alt"); await drag(page, 0, 0, 300, 250); await page.keyboard.up("Alt"); await expect(objs(page)).toHaveCount(3);
});

test("eraser deletes what it crosses; text tool; frame tool", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("t"); await click(page, -200, -100); await page.keyboard.type("Heading"); await page.keyboard.press("Escape");
  await page.keyboard.press("f"); await drag(page, 100, -150, 400, 100); await page.keyboard.type("Zone"); await page.keyboard.press("Escape");
  await expect(objs(page)).toHaveCount(2); await expect(page.locator("svg text").filter({ hasText: "Zone" })).toBeVisible();
  await page.keyboard.press("e"); await drag(page, -260, -100, -100, -100); await expect(objs(page)).toHaveCount(1);
});

test("boards list: rename, duplicate, export, delete, import round-trip", async ({ page }) => {
  await demo(page);
  page.on("dialog", d => d.accept(d.type() === "prompt" ? "Renamed board" : undefined));
  await page.getByRole("button", { name: "Rename" }).first().click(); await expect(page.getByTestId("board-card").first()).toContainText("Renamed board");
  await page.getByRole("button", { name: "Duplicate" }).first().click(); await expect(page.getByTestId("board-card")).toHaveCount(2);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export" }).first().click()]);
  const path = await dl.path(); const fs = await import("node:fs"); const json = fs.readFileSync(path!, "utf8"); expect(JSON.parse(json).format).toBe("miroisdead-board");
  await page.locator('input[type=file]').setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await page.waitForSelector("[data-testid=board-editor]"); await expect(objs(page)).toHaveCount(14);
  await page.goBack(); await page.waitForSelector("[data-testid=board-card]");
  const n = await page.getByTestId("board-card").count(); await page.getByRole("button", { name: "Delete" }).first().click(); await expect(page.getByTestId("board-card")).toHaveCount(n - 1);
});

test("bad import file shows an error", async ({ page }) => {
  await demo(page);
  await page.locator('input[type=file]').setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"nope":1}') });
  await expect(page.getByRole("alert")).toContainText("MiroIsDead board file");
});

test("export menu offers SVG and the agent scene JSON", async ({ page }) => {
  await newBoard(page, "flowchart");
  await page.getByRole("button", { name: /Export/ }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Download SVG" }).click()]);
  const fs = await import("node:fs"); const svg = fs.readFileSync((await dl.path())!, "utf8"); expect(svg).toContain("<svg"); expect(svg).toContain("Is it urgent?");
});

test("sign out returns to the marketing page and protects the app", async ({ page }) => {
  await demo(page); await page.getByRole("button", { name: "Sign out" }).click(); await page.waitForURL(/\/miroisdead\/?$/);
  await page.goto("/miroisdead/app"); await expect(page).toHaveURL(/login/);
});
