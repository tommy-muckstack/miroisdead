import type { Doc, Id, Obj, Pt, Box } from "./types";
import { isBox } from "./types";
import { boxOf, boxesIntersect, boxContains, distToPolyline, pointInBox } from "./geometry";
import { boundsOf, hitConnector } from "./connectors";
import { renderOrder } from "./doc";

/** Top-most object under a world point. `tol` is the pick tolerance in world units (6px / zoom). */
export function hitTest(doc: Doc, p: Pt, tol: number, skip?: Set<Id>): Id | null {
  const order = renderOrder(doc);
  for (let i = order.length - 1; i >= 0; i--) {
    const o = doc.objects[order[i]]; if (!o || skip?.has(o.id)) continue;
    if (hits(doc, o, p, tol)) return o.id;
  }
  return null;
}
export function hits(doc: Doc, o: Obj, p: Pt, tol: number): boolean {
  if (o.type === "connector") return hitConnector(doc, o, p, tol);
  const b = boxOf(o);
  if (o.type === "frame") { // frames are grabbed by title tab or border, so their inside stays a canvas
    const inTitle = p.x >= b.x && p.x <= b.x + Math.min(b.w, 240) && p.y >= b.y - 26 && p.y <= b.y;
    const onBorder = pointInBox(p, b, tol) && !pointInBox(p, { x: b.x + tol, y: b.y + tol, w: b.w - tol * 2, h: b.h - tol * 2 });
    return inTitle || onBorder;
  }
  if (o.type === "pen") return pointInBox(p, b, tol + o.width) && distToPolyline(p, o.points.map(q => ({ x: q.x + o.x, y: q.y + o.y }))) <= tol + o.width / 2;
  return pointInBox(p, b, tol);
}
/** Objects touched by a marquee. Frames only count when fully enclosed. */
export function marquee(doc: Doc, rect: Box): Id[] {
  return doc.order.filter(id => {
    const o = doc.objects[id], b = boundsOf(doc, o);
    return o.type === "frame" ? boxContains(rect, b) : isBox(o) || o.type === "connector" ? boxesIntersect(rect, b) : false;
  });
}
