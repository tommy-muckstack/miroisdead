// Performance check: first load, 500+ objects paint, pan/zoom frame times, input latency (sticky creation → paint).
import { chromium } from "@playwright/test";
const BASE = "http://localhost:3000/miroisdead";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`${BASE}/login`); await p.getByText("Sign in with the demo account instead").click(); await p.waitForURL("**/app"); await p.waitForSelector("[data-testid=board-card]");
// build a 600-object board through the UI store (localStorage) then open it
await p.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.endsWith(":index")); const scope = k.replace("miroisdead:v1:", "").replace(":index", "");
  const objects = {}, order = []; const colors = ["#FFF9B1", "#FFD8A8", "#B9E6FF", "#CFF4C0"];
  for (let i = 0; i < 600; i++) { const id = "o" + i; objects[id] = { id, type: i % 5 === 4 ? "shape" : "sticky", shape: "round", x: (i % 30) * 210, y: Math.floor(i / 30) * 210, w: 180, h: 180, text: "Item " + i + " lorem ipsum dolor", color: colors[i % 4], fill: "#E5E2FF", stroke: "#1C1C1E", filled: true, dashed: false, fontSize: i % 5 === 4 ? 16 : "auto" }; order.push(id); }
  for (let i = 0; i < 100; i++) { const id = "c" + i; objects[id] = { id, type: "connector", from: { id: "o" + i }, to: { id: "o" + (i + 31) }, style: "elbow", startArrow: false, endArrow: true, dashed: false, stroke: "#1C1C1E", label: "" }; order.push(id); }
  const board = { id: "perf-board-1", title: "Perf 700", createdAt: Date.now(), updatedAt: Date.now(), doc: { objects, order }, view: { x: 3000, y: 2000, zoom: 0.3 } };
  localStorage.setItem(`miroisdead:v1:${scope}:board:perf-board-1`, JSON.stringify(board));
  const idx = JSON.parse(localStorage.getItem(k) ?? "[]"); idx.push({ id: board.id, title: board.title, createdAt: board.createdAt, updatedAt: board.updatedAt, objectCount: order.length }); localStorage.setItem(k, JSON.stringify(idx));
});
const t0 = Date.now(); await p.goto(`${BASE}/app/board/perf-board-1`); await p.waitForSelector("svg g[data-obj]"); const firstPaint = Date.now() - t0;
const count = await p.locator("svg [data-obj]").count();
const r = await p.getByTestId("canvas").boundingBox(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
// pan: 40 wheel ticks, measure frames via rAF
const pan = await p.evaluate(async () => { const t = []; let last = performance.now(); let n = 0; await new Promise(res => { const f = () => { const now = performance.now(); t.push(now - last); last = now; if (++n < 60) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return t; });
await p.mouse.move(cx, cy); for (let i = 0; i < 40; i++) await p.mouse.wheel(10, 10);
const panFrames = await p.evaluate(async () => { const t = []; let last = performance.now(); let n = 0; await new Promise(res => { const f = () => { const now = performance.now(); t.push(now - last); last = now; if (++n < 60) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return t; });
await p.keyboard.down("Meta"); for (let i = 0; i < 20; i++) await p.mouse.wheel(0, -30); await p.keyboard.up("Meta");
const t1 = performance.now?.() ?? Date.now(); const tStart = Date.now(); await p.keyboard.press("n"); await p.mouse.click(cx, cy); await p.waitForFunction(c => document.querySelectorAll("svg [data-obj]").length > c, count); const inputLatency = Date.now() - tStart;
const p95 = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length * 0.95)];
console.log(JSON.stringify({ objects: count, firstPaintMs: firstPaint, idleFrameP95: +p95(pan).toFixed(1), panFrameP95: +p95(panFrames).toFixed(1), stickyCreateToPaintMs: inputLatency }));
await b.close();
