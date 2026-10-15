// Pure document operations. Every function returns a new Doc and never mutates its input.
import type { BoxObj, ConnectorObj, Doc, End, FrameObj, Id, Obj, PenObj, Pt, ShapeObj, Side, StickyObj, TextObj, Box } from "./types";
import { STICKY_COLORS, isBox } from "./types";
import { DIR, OPPOSITE, anchorPoint, boxContains, boxOf, center, pointInBox, unionBox } from "./geometry";
import { resolveConnector, boundsOf } from "./connectors";

let counter = 0;
export function nid(): Id {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 10) : Math.random().toString(36).slice(2, 12);
  return `${r}${(counter++).toString(36)}`;
}

export const STICKY_SIZE = 180, SHAPE_W = 160, SHAPE_H = 110, FRAME_PAD = 40;

export const sticky = (x: number, y: number, p: Partial<StickyObj> = {}): StickyObj => ({ id: nid(), type: "sticky", x, y, w: STICKY_SIZE, h: STICKY_SIZE, text: "", color: STICKY_COLORS[0], fontSize: "auto", ...p });
export const shape = (x: number, y: number, p: Partial<ShapeObj> = {}): ShapeObj => ({ id: nid(), type: "shape", shape: "rect", x, y, w: SHAPE_W, h: SHAPE_H, text: "", fill: "#FFFFFF", stroke: "#1C1C1E", filled: true, dashed: false, fontSize: 16, ...p });
export const textObj = (x: number, y: number, p: Partial<TextObj> = {}): TextObj => ({ id: nid(), type: "text", x, y, w: 200, h: 36, text: "", fontSize: 20, color: "#1C1C1E", bold: false, ...p });
export const frame = (x: number, y: number, w: number, h: number, name = "Frame", p: Partial<FrameObj> = {}): FrameObj => ({ id: nid(), type: "frame", x, y, w, h, name, ...p });
export const pen = (points: Pt[], stroke = "#1C1C1E", width = 3, p: Partial<PenObj> = {}): PenObj => {
  const b = unionBox(points.map(q => ({ x: q.x, y: q.y, w: 0, h: 0 })))!;
  return { id: nid(), type: "pen", x: b.x, y: b.y, w: b.w, h: b.h, points: points.map(q => ({ x: q.x - b.x, y: q.y - b.y })), stroke, width, ...p };
};
export const connector = (from: End, to: End, p: Partial<ConnectorObj> = {}): ConnectorObj => ({ id: nid(), type: "connector", from, to, style: "elbow", startArrow: false, endArrow: true, dashed: false, stroke: "#1C1C1E", label: "", ...p });

export const makeDoc = (objs: Obj[]): Doc => addObjects({ objects: {}, order: [] }, objs);
export function addObjects(doc: Doc, objs: Obj[]): Doc {
  const objects = { ...doc.objects }; const order = doc.order.slice();
  for (const o of objs) { objects[o.id] = o; if (!order.includes(o.id)) order.push(o.id); }
  return { objects, order };
}
export function updateObjects(doc: Doc, ids: Id[], patch: Partial<Obj> | ((o: Obj) => Partial<Obj>)): Doc {
  let objects = doc.objects; let changed = false;
  for (const id of ids) {
    const o = doc.objects[id]; if (!o) continue;
    const p = typeof patch === "function" ? patch(o) : patch;
    const next = { ...o, ...p } as Obj;
    if (!changed) { objects = { ...objects }; changed = true; }
    objects[id] = next;
  }
  return changed ? { objects, order: doc.order } : doc;
}
/** Remove objects; connectors that were attached to them keep their last position as free ends. */
export function removeObjects(doc: Doc, ids: Id[]): Doc {
  const gone = new Set(ids);
  const detach = (c: ConnectorObj): ConnectorObj => {
    if (gone.has(c.id)) return c;
    const dangling = ("id" in c.from && gone.has(c.from.id)) || ("id" in c.to && gone.has(c.to.id));
    if (!dangling) return c;
    const r = resolveConnector(doc, c);
    return { ...c, from: "id" in c.from && gone.has(c.from.id) ? { x: r.a.x, y: r.a.y } : c.from, to: "id" in c.to && gone.has(c.to.id) ? { x: r.b.x, y: r.b.y } : c.to };
  };
  const objects: Record<Id, Obj> = {};
  for (const id of doc.order) { if (gone.has(id)) continue; const o = doc.objects[id]; objects[id] = o.type === "connector" ? detach(o) : o; }
  return { objects, order: doc.order.filter(id => !gone.has(id)) };
}
export function moveObjects(doc: Doc, ids: Id[], dx: number, dy: number): Doc {
  if (!dx && !dy) return doc;
  return updateObjects(doc, ids, o => {
    if (isBox(o)) return { x: o.x + dx, y: o.y + dy };
    const sh = (e: End): End => ("id" in e ? e : { x: e.x + dx, y: e.y + dy });
    return { from: sh(o.from), to: sh(o.to) };
  });
}
export function resizeObject(doc: Doc, id: Id, box: Box): Doc {
  const o = doc.objects[id]; if (!o || !isBox(o)) return doc;
  const min = o.type === "frame" ? 80 : 24, b = { x: box.x, y: box.y, w: Math.max(min, box.w), h: Math.max(min, box.h) };
  if (o.type === "pen") { const sx = o.w ? b.w / o.w : 1, sy = o.h ? b.h / o.h : 1; return updateObjects(doc, [id], { ...b, points: o.points.map(p => ({ x: p.x * sx, y: p.y * sy })) }); }
  return updateObjects(doc, [id], b);
}
/** Ids of everything whose centre sits inside the frame (drag them along with it). */
export function frameChildren(doc: Doc, frameId: Id): Id[] {
  const f = doc.objects[frameId]; if (!f || f.type !== "frame") return [];
  const fb = boxOf(f), out: Id[] = [];
  for (const id of doc.order) { const o = doc.objects[id]; if (id === frameId) continue; if (o.type === "connector") continue; if (pointInBox(center(boxOf(o)), fb)) out.push(id); }
  return out;
}
/** Selection plus frame contents, so dragging a frame moves what it holds. */
export function withFrameChildren(doc: Doc, ids: Id[]): Id[] {
  const set = new Set(ids);
  for (const id of ids) if (doc.objects[id]?.type === "frame") for (const c of frameChildren(doc, id)) set.add(c);
  return [...set];
}
export function bringToFront(doc: Doc, ids: Id[]): Doc { const s = new Set(ids); return { ...doc, order: [...doc.order.filter(i => !s.has(i)), ...doc.order.filter(i => s.has(i))] }; }
export function sendToBack(doc: Doc, ids: Id[]): Doc { const s = new Set(ids); return { ...doc, order: [...doc.order.filter(i => s.has(i)), ...doc.order.filter(i => !s.has(i))] }; }
/** Render order: frames behind everything else, otherwise insertion/z order. */
export const renderOrder = (doc: Doc): Id[] => [...doc.order.filter(i => doc.objects[i]?.type === "frame"), ...doc.order.filter(i => doc.objects[i] && doc.objects[i].type !== "frame")];

export type Align = "left" | "center" | "right" | "top" | "middle" | "bottom";
export function align(doc: Doc, ids: Id[], how: Align): Doc {
  const boxes = ids.map(i => doc.objects[i]).filter((o): o is BoxObj => !!o && isBox(o));
  const u = unionBox(boxes.map(boxOf)); if (!u || boxes.length < 2) return doc;
  return updateObjects(doc, boxes.map(b => b.id), o => { const b = o as BoxObj; return how === "left" ? { x: u.x } : how === "right" ? { x: u.x + u.w - b.w } : how === "center" ? { x: u.x + (u.w - b.w) / 2 } : how === "top" ? { y: u.y } : how === "bottom" ? { y: u.y + u.h - b.h } : { y: u.y + (u.h - b.h) / 2 }; });
}
/** Even gaps between objects along an axis (first and last stay put). */
export function distribute(doc: Doc, ids: Id[], axis: "h" | "v"): Doc {
  const boxes = ids.map(i => doc.objects[i]).filter((o): o is BoxObj => !!o && isBox(o));
  if (boxes.length < 3) return doc;
  const k = axis === "h" ? "x" : "y", s = axis === "h" ? "w" : "h";
  const sorted = [...boxes].sort((a, b) => a[k] - b[k]);
  const first = sorted[0], last = sorted[sorted.length - 1];
  const total = last[k] + last[s] - first[k], used = sorted.reduce((t, b) => t + b[s], 0), gap = (total - used) / (sorted.length - 1);
  let cursor = first[k] + first[s] + gap; const patch: Record<Id, number> = {};
  for (const b of sorted.slice(1, -1)) { patch[b.id] = cursor; cursor += b[s] + gap; }
  return updateObjects(doc, Object.keys(patch), o => ({ [k]: patch[o.id] }));
}

/** Copy objects (with new ids, offset). Connectors come along when both ends are inside the set or free. */
export function cloneObjects(doc: Doc, ids: Id[], dx = 24, dy = 24): { objs: Obj[]; ids: Id[] } {
  const set = new Set(ids), map = new Map<Id, Id>(), out: Obj[] = [];
  for (const id of doc.order) if (set.has(id) && doc.objects[id].type !== "connector") map.set(id, nid());
  for (const id of doc.order) {
    if (!set.has(id)) continue; const o = doc.objects[id];
    if (isBox(o)) out.push({ ...o, id: map.get(id)!, x: o.x + dx, y: o.y + dy } as Obj);
    else {
      const fix = (e: End): End | null => ("id" in e ? (map.has(e.id) ? { ...e, id: map.get(e.id)! } : null) : { x: e.x + dx, y: e.y + dy });
      const f = fix(o.from), t = fix(o.to);
      if (f && t) { const nidc = nid(); map.set(id, nidc); out.push({ ...o, id: nidc, from: f, to: t }); }
    }
  }
  return { objs: out, ids: out.map(o => o.id) };
}
export function pasteObjects(doc: Doc, objs: Obj[], dx: number, dy: number): { doc: Doc; ids: Id[] } {
  const tmp = makeDoc(objs); const c = cloneObjects(tmp, objs.map(o => o.id), dx, dy);
  return { doc: addObjects(doc, c.objs), ids: c.ids };
}

let frameCount = 0;
/** Wrap objects in a new frame (F with a selection). Returns the frame id. */
export function frameAround(doc: Doc, ids: Id[], name?: string): { doc: Doc; id: Id } | null {
  const u = unionBox(ids.map(i => doc.objects[i]).filter(Boolean).map(o => boundsOf(doc, o)));
  if (!u) return null;
  const f = frame(u.x - FRAME_PAD, u.y - FRAME_PAD - 20, u.w + FRAME_PAD * 2, u.h + FRAME_PAD * 2 + 20, name ?? `Frame ${++frameCount}`);
  return { doc: addObjects(doc, [f]), id: f.id };
}

/** Miro-style quick-create: clone a shape/sticky to one side, connected. */
export function createConnected(doc: Doc, fromId: Id, side: Side, gap = 90): { doc: Doc; id: Id; connId: Id } | null {
  const o = doc.objects[fromId]; if (!o || (o.type !== "sticky" && o.type !== "shape" && o.type !== "text")) return null;
  const d = DIR[side], dx = d.x * (o.w + gap), dy = d.y * (o.h + gap);
  const clone = { ...o, id: nid(), x: o.x + dx, y: o.y + dy, text: "" } as BoxObj;
  const conn = connector({ id: fromId, side }, { id: clone.id, side: OPPOSITE[side] }, { stroke: "#1C1C1E" });
  return { doc: addObjects(doc, [clone, conn]), id: clone.id, connId: conn.id };
}

export const objectCount = (doc: Doc) => doc.order.length;
export const idsOfType = (doc: Doc, ids: Id[], t: Obj["type"]) => ids.filter(i => doc.objects[i]?.type === t);
export { anchorPoint, boxContains };
