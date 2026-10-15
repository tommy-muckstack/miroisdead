import type { Box, ConnectorObj, Doc, End, Obj, Pt, Side } from "./types";
import { isBox } from "./types";
import { DIR, OPPOSITE, anchorPoint, boxOf, distToPolyline, sideToward, unionBox } from "./geometry";

const STUB = 24;
export type Resolved = { a: Pt; sa: Side | null; b: Pt; sb: Side | null; aBound: boolean; bBound: boolean };

const isBound = (e: End): e is { id: string; side?: Side } => "id" in e;

/** Resolve both ends of a connector to canvas points (and the side each leaves from when bound to an object). */
export function resolveConnector(doc: Doc, c: ConnectorObj): Resolved {
  const boxOf_ = (e: End): Box | null => {
    if (!isBound(e)) return null;
    const o = doc.objects[e.id];
    return o && isBox(o) ? boxOf(o) : null;
  };
  const fb = boxOf_(c.from), tb = boxOf_(c.to);
  const freeFrom = !isBound(c.from) ? { x: c.from.x, y: c.from.y } : null, freeTo = !isBound(c.to) ? { x: c.to.x, y: c.to.y } : null;
  // Targets used to pick "auto" sides: the other end's anchor (or centre).
  const otherPoint = (own: Box, otherBox: Box | null, otherFree: Pt | null): Pt => otherFree ?? (otherBox ? { x: otherBox.x + otherBox.w / 2, y: otherBox.y + otherBox.h / 2 } : { x: own.x + own.w + 1, y: own.y + own.h / 2 });
  let a: Pt, b: Pt, sa: Side | null = null, sb: Side | null = null;
  if (fb) { sa = (c.from as { side?: Side }).side ?? sideToward(fb, otherPoint(fb, tb, freeTo)); a = anchorPoint(fb, sa); } else a = freeFrom ?? { x: 0, y: 0 };
  if (tb) { sb = (c.to as { side?: Side }).side ?? sideToward(tb, otherPoint(tb, fb, freeFrom)); b = anchorPoint(tb, sb); } else b = freeTo ?? { x: 0, y: 0 };
  return { a, sa, b, sb, aBound: !!fb, bBound: !!tb };
}

const dirToward = (from: Pt, to: Pt): Side => (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? (to.x >= from.x ? "e" : "w") : to.y >= from.y ? "s" : "n");

function dedupe(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) { const l = out[out.length - 1]; if (!l || Math.abs(l.x - p.x) > 0.01 || Math.abs(l.y - p.y) > 0.01) out.push(p); }
  // drop collinear middle points
  const res: Pt[] = [];
  for (const p of out) {
    while (res.length >= 2) {
      const a = res[res.length - 2], b = res[res.length - 1];
      if ((Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - p.x) < 0.01) || (Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - p.y) < 0.01)) res.pop(); else break;
    }
    res.push(p);
  }
  return res;
}

/** Orthogonal route between two anchors. `sa`/`sb` are the sides the line leaves / enters through (null = free end). */
export function routeElbow(a: Pt, sa: Side | null, b: Pt, sb: Side | null): Pt[] {
  const s1: Side = sa ?? dirToward(a, b), s2: Side = sb ?? dirToward(b, a);
  const da = DIR[s1], db = DIR[s2];
  const sA = sa ? STUB : 0, sB = sb ? STUB : 0;
  const A = { x: a.x + da.x * sA, y: a.y + da.y * sA }, B = { x: b.x + db.x * sB, y: b.y + db.y * sB };
  const horiz = (s: Side) => s === "e" || s === "w";
  let pts: Pt[];
  if (horiz(s1) && horiz(s2)) {
    if (da.x === -db.x && (B.x - A.x) * da.x >= 0) { const mx = (A.x + B.x) / 2; pts = [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]; }
    else if (da.x === db.x) { const X = da.x > 0 ? Math.max(A.x, B.x) : Math.min(A.x, B.x); pts = [a, { x: X, y: a.y }, { x: X, y: b.y }, b]; }
    else { const my = a.y === b.y ? a.y - 60 : (a.y + b.y) / 2; pts = [a, A, { x: A.x, y: my }, { x: B.x, y: my }, B, b]; }
  } else if (!horiz(s1) && !horiz(s2)) {
    if (da.y === -db.y && (B.y - A.y) * da.y >= 0) { const my = (A.y + B.y) / 2; pts = [a, { x: a.x, y: my }, { x: b.x, y: my }, b]; }
    else if (da.y === db.y) { const Y = da.y > 0 ? Math.max(A.y, B.y) : Math.min(A.y, B.y); pts = [a, { x: a.x, y: Y }, { x: b.x, y: Y }, b]; }
    else { const mx = a.x === b.x ? a.x - 60 : (a.x + b.x) / 2; pts = [a, A, { x: mx, y: A.y }, { x: mx, y: B.y }, B, b]; }
  } else if (horiz(s1)) { // horizontal out, vertical in
    const corner = { x: b.x, y: a.y };
    if (Math.sign(b.x - a.x) === da.x && Math.sign(b.y - a.y) === -db.y) pts = [a, corner, b];
    else pts = [a, A, { x: A.x, y: B.y }, B, b];
  } else { // vertical out, horizontal in
    const corner = { x: a.x, y: b.y };
    if (Math.sign(b.y - a.y) === da.y && Math.sign(b.x - a.x) === -db.x) pts = [a, corner, b];
    else pts = [a, A, { x: B.x, y: A.y }, B, b];
  }
  return dedupe(pts);
}

/** SVG path through the points with rounded corners. */
export function roundedPath(pts: Pt[], r = 10): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p = pts[i], p1 = pts[i + 1];
    const l0 = Math.hypot(p.x - p0.x, p.y - p0.y), l1 = Math.hypot(p1.x - p.x, p1.y - p.y), rr = Math.min(r, l0 / 2, l1 / 2);
    const s = { x: p.x + ((p0.x - p.x) / l0) * rr, y: p.y + ((p0.y - p.y) / l0) * rr }, e = { x: p.x + ((p1.x - p.x) / l1) * rr, y: p.y + ((p1.y - p.y) / l1) * rr };
    d += `L${s.x} ${s.y}Q${p.x} ${p.y} ${e.x} ${e.y}`;
  }
  const l = pts[pts.length - 1]; return d + `L${l.x} ${l.y}`;
}

export type Route = { points: Pt[]; path: string; label: Pt; startDir: Pt; endDir: Pt };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => { const u = 1 - t; return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }; };

export function routeConnector(doc: Doc, c: ConnectorObj): Route {
  const { a, sa, b, sb } = resolveConnector(doc, c);
  const s1: Side = sa ?? dirToward(a, b), s2: Side = sb ?? dirToward(b, a);
  if (c.style === "straight") {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    return { points: [a, b], path: `M${a.x} ${a.y}L${b.x} ${b.y}`, label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, startDir: { x: -dx / l, y: -dy / l }, endDir: { x: dx / l, y: dy / l } };
  }
  if (c.style === "curve") {
    const k = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) / 2.5);
    const p1 = { x: a.x + DIR[s1].x * k, y: a.y + DIR[s1].y * k }, p2 = { x: b.x + DIR[s2].x * k, y: b.y + DIR[s2].y * k };
    const pts = Array.from({ length: 25 }, (_, i) => bez(a, p1, p2, b, i / 24));
    return { points: pts, path: `M${a.x} ${a.y}C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${b.x} ${b.y}`, label: bez(a, p1, p2, b, 0.5), startDir: { x: -DIR[s1].x, y: -DIR[s1].y }, endDir: { x: -DIR[s2].x, y: -DIR[s2].y } };
  }
  const pts = routeElbow(a, sa, b, sb), n = pts.length;
  const dirOf = (p: Pt, q: Pt): Pt => { const l = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { x: (q.x - p.x) / l, y: (q.y - p.y) / l }; };
  // label at the midpoint of the longest-travelled position along the path
  let total = 0; for (let i = 1; i < n; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let acc = 0, label = pts[0]; for (let i = 1; i < n; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (acc + l >= total / 2) { const t = (total / 2 - acc) / (l || 1); label = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }; break; } acc += l; }
  return { points: pts, path: roundedPath(pts), label, startDir: n > 1 ? dirOf(pts[1], pts[0]) : { x: -1, y: 0 }, endDir: n > 1 ? dirOf(pts[n - 2], pts[n - 1]) : { x: 1, y: 0 } };
}

export function connectorBounds(doc: Doc, c: ConnectorObj): Box { return unionBox(routeConnector(doc, c).points.map(p => ({ x: p.x, y: p.y, w: 0, h: 0 })))!; }
export function hitConnector(doc: Doc, c: ConnectorObj, p: Pt, tol: number): boolean { return distToPolyline(p, routeConnector(doc, c).points) <= tol; }
export const boundsOf = (doc: Doc, o: Obj): Box => (isBox(o) ? boxOf(o) : connectorBounds(doc, o));
export { OPPOSITE };
