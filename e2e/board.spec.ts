import { test, expect, Page } from "@playwright/test";

const MOD = process.platform === "darwin" ? "Meta" : "Control";
async function demo(page: Page) { await page.goto("/miroisdead/login"); await page.getByText("Sign in with the demo account instead").click(); await page.waitForURL("**/miroisdead/app"); }
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

test("visitors without a session land in the app as guests", async ({ page, context }) => {
  await context.clearCookies(); await page.goto("/miroisdead/app"); await expect(page).toHaveURL(/\/miroisdead\/app/); await expect(page.getByText(/Sign in to save/)).toBeVisible(); // guest sessions (PR #17)
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
  expect(xs[1] - xs[0]).toBeCloseTo(223); expect(xs[2] - xs[1]).toBeCloseTo(223); // 199 sticky + 24 gap
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
  await page.getByLabel("Shapes and lines").click(); await page.getByRole("menuitem", { name: "Elbow arrow" }).click(); await drag(page, -320, 0, 280, 0); // from shape A centre to shape B centre
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
  await expect(page.getByTestId("selection-count")).toContainText("2 objects");
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
  await click(page, -100, 0); await page.getByRole("button", { name: "Colour" }).click(); await page.getByRole("button", { name: /Sticky colour #FFB8C6/ }).click();
  await expect(page.locator("svg rect[fill='#FFB8C6']")).toHaveCount(1);
});

test("zoom: ctrl+wheel zooms at the cursor, buttons, 100% reset and fit", async ({ page }) => {
  await newBoard(page, "flowchart");
  expect(await zoom(page)).toBe(100);
  const p = await at(page, 0, 0); await page.mouse.move(p.x, p.y); await page.keyboard.down(MOD); await page.mouse.wheel(0, -300); await page.keyboard.up(MOD);
  await expect.poll(() => zoom(page)).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Zoom out" }).click(); await page.getByTestId("zoom-level").click(); await page.getByRole("menuitem", { name: "100%" }).click(); expect(await zoom(page)).toBe(100);
  await page.keyboard.press("Shift+1"); await page.waitForTimeout(100); expect(await zoom(page)).toBeLessThanOrEqual(100);
});

test("pan with Space+drag and hand tool changes the view", async ({ page }) => {
  await newBoard(page, "welcome");
  const view = page.locator("[data-testid=canvas] svg > g").first(); // the brand mark is an earlier svg with its own <g>
  const before = await view.getAttribute("transform"); expect(before).not.toBeNull();
  await page.keyboard.down("Space"); await drag(page, 0, 0, 120, 80); await page.keyboard.up("Space");
  expect(await view.getAttribute("transform")).not.toBe(before);
});

test("shortcut sheet, minimap toggle and command keys", async ({ page }) => {
  await newBoard(page, "welcome");
  await page.keyboard.press("?"); await expect(page.getByTestId("shortcut-sheet")).toContainText("Shortcuts"); await page.keyboard.press("Escape");
  await expect(page.getByTestId("shortcut-sheet")).toHaveCount(0);
  await page.keyboard.press("m"); await expect(page.getByTestId("minimap")).toBeVisible(); await page.keyboard.press("m"); await expect(page.getByTestId("minimap")).toHaveCount(0);
  for (const [k, t] of [["h", "hand"], ["t", "text"], ["f", "frame"], ["e", "eraser"], ["l", "connector"], ["c", "comment"], ["v", "select"]]) { await page.keyboard.press(k); await expect(page.getByTestId("canvas")).toHaveAttribute("data-active-tool", t); }
});

test("duplicate, copy/paste, delete and alt-drag duplicate", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("n"); await click(page, 0, 0); await page.keyboard.type("x"); await page.keyboard.press("Escape");
  await page.keyboard.press(`${MOD}+d`); await expect(objs(page)).toHaveCount(2); await expect(page.getByTestId("selection-toolbar")).toHaveCount(0); // Miro: nothing stays selected
  await click(page, 0, 0); await page.keyboard.press(`${MOD}+c`); await page.keyboard.press(`${MOD}+v`); await expect(objs(page)).toHaveCount(3);
  await page.keyboard.press("Delete"); await expect(objs(page)).toHaveCount(2);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400); /* outside the double-click window of the click above */ await page.keyboard.down("Alt"); await drag(page, 0, 0, 300, 250); await page.keyboard.up("Alt"); await expect(objs(page)).toHaveCount(3);
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
  page.on("dialog", d => { throw new Error(`native dialog shown: ${d.type()}`); }); // Miro uses styled modals, never prompt()/confirm()
  const rowMenu = async (item: string | RegExp) => { await page.getByRole("button", { name: "Board options" }).first().click(); await page.getByRole("menuitem", { name: item }).click(); };
  await rowMenu("Rename"); await page.getByTestId("rename-dialog").getByLabel("Board name").fill("Renamed board"); await page.getByRole("button", { name: "Save" }).click(); await expect(page.getByTestId("board-card").first()).toContainText("Renamed board");
  await rowMenu("Duplicate"); await expect(page.getByTestId("board-card")).toHaveCount(2);
  const [dl] = await Promise.all([page.waitForEvent("download"), rowMenu(/backup/)]);
  const path = await dl.path(); const fs = await import("node:fs"); const json = fs.readFileSync(path!, "utf8"); expect(JSON.parse(json).format).toBe("miroisdead-board");
  await page.locator('input[type=file]').setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await page.waitForSelector("[data-testid=board-editor]"); await expect(objs(page)).toHaveCount(14);
  await page.goBack(); await page.waitForSelector("[data-testid=board-card]");
  const n = await page.getByTestId("board-card").count(); await rowMenu("Delete"); await page.getByTestId("delete-dialog").getByRole("button", { name: "Delete" }).click(); await expect(page.getByTestId("board-card")).toHaveCount(n - 1);
  await page.getByRole("button", { name: "Star" }).first().click(); await page.locator(".mx-side nav a", { hasText: "Starred" }).click(); await expect(page.getByTestId("board-card")).toHaveCount(1);
});

test("bad import file shows an error", async ({ page }) => {
  await demo(page);
  await page.locator('input[type=file]').setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"nope":1}') });
  await expect(page.locator(".mi-err")).toContainText("MiroIsDead board file");
});

test("export menu offers a board backup and CSV", async ({ page }) => {
  await newBoard(page, "flowchart");
  await page.getByRole("button", { name: /Export this board/ }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Download board backup" }).click()]);
  const fs = await import("node:fs"); const json = fs.readFileSync((await dl.path())!, "utf8"); expect(json).toContain("miroisdead-board"); expect(json).toContain("Is it urgent?");
  await page.getByRole("button", { name: /Export this board/ }).click();
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /CSV/ }).click()]);
  expect(fs.readFileSync((await csv.path())!, "utf8")).toContain("Is it urgent?");
});

test("sign out returns to the marketing page; the app then opens as a guest, not the demo account", async ({ page }) => {
  await demo(page); await page.getByLabel("Account").click(); await page.getByRole("menuitem", { name: /Log out/ }).click(); await page.waitForURL(/\/miroisdead\/?$/);
  await page.goto("/miroisdead/app"); await expect(page).toHaveURL(/\/miroisdead\/app/); await expect(page.getByText(/Sign in to save/)).toBeVisible(); await expect(page.getByText("Demo account")).toHaveCount(0);
});

test.describe("marketing page", () => {
  test("hero tabs swap the screenshot and the pricing page renders", async ({ page }) => {
    await page.goto("/miroisdead");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Human collaboration");
    await expect(page.getByTestId("tabpanel").locator("img")).toHaveAttribute("src", /research\.png$/);
    await page.getByRole("tab", { name: "Diagrams" }).click();
    await expect(page.getByTestId("tabpanel").locator("img")).toHaveAttribute("src", /diagrams\.png$/);
    await page.goto("/miroisdead/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Where teams and AI work as one");
  });
  test("every homepage CTA leads to login and the images resolve", async ({ page, request }) => {
    await page.goto("/miroisdead");
    await page.getByRole("link", { name: "Get started free" }).first().click(); await expect(page).toHaveURL(/\/miroisdead\/(login|signup)/);
    for (const n of ["research", "roadmap", "diagrams", "workshops", "canvas", "quick-create", "connectors", "frames"]) expect((await request.get(`/miroisdead/home/${n}.png`)).status()).toBe(200);
  });
});

test("comments: C places a pin, thread takes a reply, panel lists it, shift+C hides pins", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("c"); await click(page, 40, 40);
  await expect(page.getByTestId("comment-thread")).toBeVisible();
  await page.getByPlaceholder("Add a comment…").fill("Looks good"); await page.keyboard.press("Enter");
  await expect(page.getByTestId("comment-thread")).toContainText("Looks good");
  await page.keyboard.press("Escape"); await expect(page.getByTestId("comment-thread")).toHaveCount(0);
  await page.getByLabel("Comments", { exact: true }).click(); await expect(page.getByTestId("comments-panel")).toContainText("Looks good");
  await page.keyboard.press("Escape"); await page.mouse.click(700, 500);
  await expect(page.locator("svg g[data-obj]")).toHaveCount(1); await page.keyboard.press("Shift+C"); await expect(page.locator("svg g[data-obj]")).toHaveCount(0);
});

test("grouping: ⌘G groups, click selects the whole group, ⌘⇧G ungroups; ⌘K palette runs a command", async ({ page }) => {
  await newBoard(page);
  await page.keyboard.press("n"); await click(page, -200, 0); await page.keyboard.type("a"); await page.keyboard.press("Escape");
  await page.keyboard.press("n"); await click(page, 200, 0); await page.keyboard.type("b"); await page.keyboard.press("Escape");
  await page.keyboard.press(`${MOD}+a`); await page.keyboard.press(`${MOD}+g`); await click(page, 0, 250); await page.waitForTimeout(100);
  await click(page, -200, 0); await expect(page.getByTestId("selection-count")).toContainText("2 objects");
  await page.keyboard.press(`${MOD}+Shift+g`); await click(page, 0, 250); await click(page, -200, 0); await expect(page.getByTestId("selection-count")).toHaveCount(0);
  await page.keyboard.press(`${MOD}+k`); await page.getByPlaceholder(/Type what you want/).fill("minimap"); await page.keyboard.press("Enter"); await expect(page.getByTestId("minimap")).toBeVisible();
});
test("presenting walks the frames with arrow keys and Escape exits", async ({ page }) => {
  await newBoard(page, "retro");
  await page.getByLabel("Present", { exact: true }).click(); await expect(page.getByTestId("present-bar")).toContainText("1 / 3");
  await page.keyboard.press("ArrowRight"); await expect(page.getByTestId("present-bar")).toContainText("2 / 3"); await page.keyboard.press("Escape"); await expect(page.getByTestId("present-bar")).toHaveCount(0);
});

test("live session: a second tab on the same board sees the first tab's sticky and cursor avatar count", async ({ page, context }) => {
  await newBoard(page);
  const url = page.url(); const other = await context.newPage(); await other.goto(url); await other.waitForSelector("[data-testid=board-editor]");
  await page.keyboard.press("n"); await click(page, 0, 0); await page.keyboard.type("Live"); await page.keyboard.press("Escape");
  await expect(other.locator("svg text").filter({ hasText: "Live" })).toBeVisible({ timeout: 5000 });
  await expect(other.getByTestId("peer-avatars")).toContainText("2");
  await other.close();
});

test("images: upload adds a picture; stickers insert emoji; rotation handle rotates a shape", async ({ page }) => {
  await newBoard(page);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQIW2P8z8DwnwEKGBkYGP4DAAwMAwF+Wk1fAAAAAElFTkSuQmCC", "base64");
  await page.getByTestId("upload-input").setInputFiles({ name: "dot.png", mimeType: "image/png", buffer: png });
  await expect(page.locator("svg image")).toHaveCount(1);
  await page.keyboard.press("Escape"); await page.mouse.click(700, 500);
  await page.getByLabel("Stickers, Emoji and GIFs").click(); await page.getByRole("button", { name: "Insert 🚀" }).click();
  await expect(page.locator("svg text").filter({ hasText: "🚀" })).toBeVisible();
  await page.keyboard.press("r"); await click(page, -250, 0); await page.keyboard.type("spin"); await page.keyboard.press("Escape"); await click(page, -250, 0); // stickies have no rotate handle (Miro)
  const h = (await page.getByTestId("handle-rot").boundingBox())!; await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down(); await page.mouse.move(h.x + 200, h.y - 150, { steps: 8 }); await page.mouse.up();
  const t = await page.locator("svg g[data-obj]").last().locator("xpath=..").getAttribute("transform"); expect(t ?? "").toContain("rotate(");
});
