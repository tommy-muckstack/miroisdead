import type { Box, Obj, Doc, Pt, Side, BoxObj } from "./types";
import { isBox } from "./types";

export const DIR: Record<Side, Pt> = { n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 } };
export const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", e: "w", w: "e" };
export const SIDES: Side[] = ["n", "e", "s", "w"];

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const center = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** Rotate a point around a centre by degrees (positive = clockwise on screen). */
export const rotatePt = (p: Pt, c: Pt, deg: number): Pt => { const r = (deg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r), dx = p.x - c.x, dy = p.y - c.y; return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }; };
export const pointInBox = (p: Pt, b: Box, pad = 0) => p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
export const boxesIntersect = (a: Box, b: Box) => a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
export const boxContains = (outer: Box, inner: Box) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
export const normBox = (a: Pt, b: Pt): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  const x1 = Math.min(...boxes.map(b => b.x)), y1 = Math.min(...boxes.map(b => b.y));
  const x2 = Math.max(...boxes.map(b => b.x + b.w)), y2 = Math.max(...boxes.map(b => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
export const anchorPoint = (b: Box, side: Side): Pt =>
  side === "n" ? { x: b.x + b.w / 2, y: b.y } : side === "s" ? { x: b.x + b.w / 2, y: b.y + b.h } : side === "e" ? { x: b.x + b.w, y: b.y + b.h / 2 } : { x: b.x, y: b.y + b.h / 2 };
/** Which side of box b faces point p (aspect-aware, so a wide box prefers e/w sooner). */
export function sideToward(b: Box, p: Pt): Side {
  const c = center(b), dx = p.x - c.x, dy = p.y - c.y;
  return Math.abs(dx) / Math.max(1, b.w) > Math.abs(dy) / Math.max(1, b.h) ? (dx >= 0 ? "e" : "w") : dy >= 0 ? "s" : "n";
}
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
export function distToPolyline(p: Pt, pts: Pt[]): number {
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distToSegment(p, pts[i - 1], pts[i]));
  return d;
}
/** Ramer–Douglas–Peucker simplification (used to clean up freehand strokes). */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!; let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) { const d = distToSegment(pts[i], pts[s], pts[e]); if (d > max) { max = d; idx = i; } }
    if (idx >= 0 && max > eps) { keep[idx] = true; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}
export function boxOf(o: BoxObj): Box { return { x: o.x, y: o.y, w: o.w, h: o.h }; }

// ---- smart guides ----
export type Guide = { axis: "x" | "y"; at: number; from: number; to: number };
/** Snap a moving box to edges/centres of other boxes within `threshold` (world units). Returns the correction and the guides to draw. */
export function snapBox(moving: Box, others: Box[], threshold: number): { dx: number; dy: number; guides: Guide[] } {
  const mx = [moving.x, moving.x + moving.w / 2, moving.x + moving.w], my = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
  let bestX: { d: number; at: number; o: Box } | null = null, bestY: { d: number; at: number; o: Box } | null = null;
  for (const o of others) {
    for (const ox of [o.x, o.x + o.w / 2, o.x + o.w]) for (const m of mx) { const d = ox - m; if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, at: ox, o }; }
    for (const oy of [o.y, o.y + o.h / 2, o.y + o.h]) for (const m of my) { const d = oy - m; if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, at: oy, o }; }
  }
  const dx = bestX?.d ?? 0, dy = bestY?.d ?? 0, snapped = { ...moving, x: moving.x + dx, y: moving.y + dy };
  const guides: Guide[] = [];
  if (bestX) guides.push({ axis: "x", at: bestX.at, from: Math.min(snapped.y, bestX.o.y), to: Math.max(snapped.y + snapped.h, bestX.o.y + bestX.o.h) });
  if (bestY) guides.push({ axis: "y", at: bestY.at, from: Math.min(snapped.x, bestY.o.x), to: Math.max(snapped.x + snapped.w, bestY.o.x + bestY.o.w) });
  return { dx, dy, guides };
}

