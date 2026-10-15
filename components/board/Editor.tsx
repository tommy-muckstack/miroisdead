"use client";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Board, Box, Doc, End, Id, Obj, Pt, Side, View, ShapeObj, StickyObj, ConnectorStyle } from "@/lib/canvas/types";
import { STICKY_COLORS, isBox } from "@/lib/canvas/types";
import { DIR, OPPOSITE, anchorPoint, boxOf, normBox, simplify, snapBox, unionBox, type Guide } from "@/lib/canvas/geometry";
import { addObjects, align, bringToFront, cloneObjects, connector, createConnected, distribute, frame, frameAround, moveObjects, nid, pasteObjects, pen, removeObjects, resizeObject, sendToBack, shape, sticky, textObj, updateObjects, withFrameChildren, type Align } from "@/lib/canvas/doc";
import { boundsOf, resolveConnector, routeConnector } from "@/lib/canvas/connectors";
import { hitTest, marquee } from "@/lib/canvas/hit";
import { LINE_HEIGHT, fitFontSize, wrapText } from "@/lib/canvas/text";
import { checkpoint, commit, createHistory, redo, replace, undo, canRedo, canUndo, type History } from "@/lib/canvas/history";
import { MAX_ZOOM, MIN_ZOOM, fitView, panBy, screenToWorld, worldToScreen, zoomAt } from "@/lib/canvas/viewport";
import { describeScene } from "@/lib/canvas/scene";
import { serialize } from "@/lib/canvas/board";
import { KEY_TO_TOOL, TOOLS, type Tool } from "@/lib/shortcuts";
import type { BoardStore } from "@/lib/store";
import { Defs, Scene, shapePath, penPath } from "./Scene";
import { boardToSvg } from "./exportSvg";
import { I, Mark } from "./icons";
import { SelectionToolbar } from "./SelectionToolbar";
import { Minimap } from "./Minimap";
import { ShortcutSheet } from "./ShortcutSheet";

type Gesture =
  | { k: "pan"; sx: number; sy: number; v: View }
  | { k: "move"; ids: Id[]; start: Doc; w0: Pt; cp: boolean; dup: boolean; clickId: Id | null; shift: boolean; moved: boolean }
  | { k: "resize"; id: Id; h: string; start: Doc; b0: Box; cp: boolean }
  | { k: "marquee"; w0: Pt; base: Id[] }
  | { k: "draw"; tool: Tool; w0: Pt }
  | { k: "pen"; pts: Pt[] }
  | { k: "conn"; from: End; fromPt: Pt; dot: { id: Id; side: Side } | null; moved: boolean }
  | { k: "cend"; id: Id; which: "from" | "to"; cp: boolean }
  | { k: "erase"; cp: boolean; start: Doc };
type Draft = { kind: "box"; tool: Tool; box: Box } | { kind: "pen"; pts: Pt[] } | { kind: "conn"; a: Pt; b: Pt } | null;
type Edit = { id: Id; isNew: boolean } | null;
type Status = "saved" | "saving" | "device" | "error";
type Last = { stickyColor: string; fill: string; stroke: string; penColor: string; penWidth: number; textColor: string; connectorStyle: ConnectorStyle; shape: ShapeObj["shape"] };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const handlePt = (b: Box, h: string): Pt => ({ x: h.includes("w") ? b.x : h.includes("e") ? b.x + b.w : b.x + b.w / 2, y: h.includes("n") ? b.y : h.includes("s") ? b.y + b.h : b.y + b.h / 2 });
const CURSOR: Record<string, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
const textual = (o: Obj) => o.type === "sticky" || o.type === "shape" || o.type === "text" || o.type === "frame" || o.type === "connector";
const textOf = (o: Obj) => (o.type === "frame" ? o.name : o.type === "connector" ? o.label : "text" in o ? o.text : "");
const download = (name: string, mime: string, data: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const textHeight = (text: string, w: number, size: number, bold: boolean) => Math.max(size * 1.6, wrapText(text || " ", w, size, undefined, bold).length * size * LINE_HEIGHT + 8);

export function Editor({ initial, store, who, signOutAction }: { initial: Board; store: BoardStore; who: string; signOutAction?: () => void | Promise<void> }) {
  const [hist, setHist] = useState<History<Doc>>(() => createHistory(initial.doc));
  const [view, setView] = useState<View>(initial.view);
  const [title, setTitle] = useState(initial.title);
  const [sel, setSel] = useState<Id[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [edit, setEdit] = useState<Edit>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [draft, setDraft] = useState<Draft>(null);
  const [marq, setMarq] = useState<Box | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [status, setStatus] = useState<Status>("saved");
  const [help, setHelp] = useState(false);
  const [map, setMap] = useState(false);
  const [menu, setMenu] = useState(false);
  const [space, setSpace] = useState(false);
  const [toast, setToast] = useState("");
  const doc = hist.present;

  const box = useRef<HTMLDivElement>(null);
  const g = useRef<Gesture | null>(null);
  const R = useRef({ doc, view, sel, tool, size, edit, title, space });
  R.current = { doc, view, sel, tool, size, edit, title, space };
  const clip = useRef<Obj[]>([]);
  const pasteN = useRef(0);
  const last = useRef<Last>({ stickyColor: STICKY_COLORS[0], fill: "#FFFFFF", stroke: "#1C1C1E", penColor: "#1C1C1E", penWidth: 3, textColor: "#1C1C1E", connectorStyle: "elbow", shape: "rect" });
  const lastClick = useRef({ t: 0, id: "" });

  // ---- size ----
  useLayoutEffect(() => {
    const el = box.current!; const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight }); return () => ro.disconnect();
  }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  // ---- history helpers ----
  const commitDoc = useCallback((next: Doc) => setHist(h => commit(h, next)), []);
  const liveDoc = useCallback((next: Doc) => setHist(h => replace(h, next)), []);
  const begin = useCallback(() => setHist(h => checkpoint(h)), []);
  const doUndo = () => { setEdit(null); setHist(h => undo(h)); };
  const doRedo = () => { setEdit(null); setHist(h => redo(h)); };
  // drop selection ids that no longer exist (after undo/delete)
  useEffect(() => { setSel(s => { const f = s.filter(i => doc.objects[i]); return f.length === s.length ? s : f; }); if (edit && !doc.objects[edit.id]) setEdit(null); }, [doc, edit]);

  // ---- autosave ----
  const first = useRef(true);
  const board = useMemo<Board>(() => ({ ...initial, title, doc, view, updatedAt: Date.now() }), [initial, title, doc, view]);
  const boardRef = useRef(board); boardRef.current = board;
  const saveNow = useCallback(async () => {
    setStatus("saving");
    try { await store.save({ ...boardRef.current, updatedAt: Date.now() }); setStatus("saved"); }
    catch { setStatus(store.kind === "cloud" ? "device" : "error"); }
  }, [store]);
  useEffect(() => { if (first.current) { first.current = false; return; } setStatus("saving"); const t = setTimeout(saveNow, 600); return () => clearTimeout(t); }, [doc, title, view, saveNow]);
  useEffect(() => { const f = () => { void store.save({ ...boardRef.current, updatedAt: Date.now() }).catch(() => {}); }; window.addEventListener("pagehide", f); const v = () => document.visibilityState === "hidden" && f(); document.addEventListener("visibilitychange", v); return () => { window.removeEventListener("pagehide", f); document.removeEventListener("visibilitychange", v); }; }, [store]);

  // ---- coordinates ----
  const rect = () => box.current!.getBoundingClientRect();
  const toWorld = (e: { clientX: number; clientY: number }): Pt => { const r = rect(); return screenToWorld(R.current.view, R.current.size, { x: e.clientX - r.left, y: e.clientY - r.top }); };
  const tol = () => 6 / R.current.view.zoom;

  // ---- actions ----
  const selectOnly = (ids: Id[]) => setSel(ids);
  const startEdit = (id: Id, isNew = false) => { setEdit({ id, isNew }); setSel([id]); };
  const backToSelect = () => setTool("select");
  const patchSel = (p: Partial<Obj> | ((o: Obj) => Partial<Obj>), remember?: Record<string, unknown>) => { commitDoc(updateObjects(R.current.doc, R.current.sel, p)); if (remember) Object.assign(last.current, remember); };
  const del = () => { const { doc: d, sel: s } = R.current; if (!s.length) return; commitDoc(removeObjects(d, s)); setSel([]); };
  const dup = () => { const { doc: d, sel: s } = R.current; if (!s.length) return; const c = cloneObjects(d, s); commitDoc(addObjects(d, c.objs)); setSel(c.ids); };
  const copy = (cut: boolean) => { const { doc: d, sel: s } = R.current; if (!s.length) return; const set = new Set(s); clip.current = d.order.filter(i => set.has(i)).map(i => d.objects[i]); pasteN.current = 0; navigator.clipboard?.writeText("MiroIsDead board objects").catch(() => {}); if (cut) del(); else flash(`Copied ${s.length} object${s.length > 1 ? "s" : ""}`); };
  const paste = () => { if (!clip.current.length) return false; pasteN.current++; const o = 24 * pasteN.current; const r = pasteObjects(R.current.doc, clip.current, o, o); commitDoc(r.doc); setSel(r.ids); return true; };
  const fitAll = () => { const { doc: d, size: s } = R.current; setView(fitView(unionBox(d.order.map(i => boundsOf(d, d.objects[i]))), s)); };
  const fitSel = () => { const { doc: d, size: s, sel: ss } = R.current; const b = unionBox(ss.map(i => d.objects[i]).filter(Boolean).map(o => boundsOf(d, o))); if (b) setView(fitView(b, s)); };
  const zoomBy = (f: number) => setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, v.zoom * f));
  const frameSel = () => { const { doc: d, sel: s } = R.current; const r = frameAround(d, s.filter(i => d.objects[i]?.type !== "frame")); if (r) { commitDoc(r.doc); setSel([r.id]); } };
  const newFrom = (x: number, y: number, kind: Tool): Obj => {
    const L = last.current;
    if (kind === "sticky") return sticky(x - 90, y - 90, { color: L.stickyColor });
    if (kind === "text") return textObj(x, y - 18, { color: L.textColor });
    const sh = kind === "ellipse" ? "ellipse" : kind === "diamond" ? "diamond" : "rect";
    return shape(x - 80, y - 55, { shape: sh, fill: L.fill, stroke: L.stroke });
  };
  const sizeFor = (o: Obj, b: Box): Obj => (isBox(o) ? ({ ...o, x: b.x, y: b.y, w: b.w, h: b.h } as Obj) : o);

  const finishEdit = (text: string, then?: "tab" | "shifttab") => {
    const e = R.current.edit; if (!e) return; const d = R.current.doc, o = d.objects[e.id]; setEdit(null);
    if (!o) return;
    const apply = e.isNew ? liveDoc : commitDoc;
    if (o.type === "text") {
      if (!text.trim()) { if (e.isNew) setHist(h => ({ past: h.past.slice(0, -1), present: removeObjects(d, [o.id]), future: [] })); else commitDoc(removeObjects(d, [o.id])); setSel([]); return; }
      apply(updateObjects(d, [o.id], { text, h: textHeight(text, o.w, o.fontSize, o.bold) }));
    } else if (o.type === "frame") apply(updateObjects(d, [o.id], { name: text.trim() || "Frame" }));
    else if (o.type === "connector") apply(updateObjects(d, [o.id], { label: text.trim() }));
    else apply(updateObjects(d, [o.id], { text }));
    if (then && (o.type === "sticky" || o.type === "shape")) {
      const nd = then === "tab" ? { x: o.x + o.w + 24, y: o.y } : { x: o.x, y: o.y + o.h + 24 };
      const clone = { ...o, id: nid(), text: "", ...nd } as Obj; // same size/colour; the previous edit is already committed above
      setHist(h => commit(h, addObjects(h.present, [clone])));
      setEdit({ id: clone.id, isNew: true }); setSel([clone.id]);
    }
  };

  // ---- pointer ----
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-ui]")) return;
    box.current!.focus({ preventScroll: true });
    if (R.current.edit) { /* blur of the editor commits */ (document.activeElement as HTMLElement)?.blur?.(); }
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { doc: d, tool: t, view: v, sel: s } = R.current, w = toWorld(e);
    if (e.button === 1 || t === "hand" || R.current.space) { g.current = { k: "pan", sx: e.clientX, sy: e.clientY, v }; return; }
    const h = (e.target as Element).closest("[data-h]")?.getAttribute("data-h");
    if (t === "select" && h) {
      if (h.startsWith("dot:")) { const side = h.slice(4) as Side, id = s[0]; const o = d.objects[id]; g.current = { k: "conn", from: { id, side }, fromPt: anchorPoint(boxOf(o as any), side), dot: { id, side }, moved: false }; return; }
      if (h === "ca" || h === "cb") { g.current = { k: "cend", id: s[0], which: h === "ca" ? "from" : "to", cp: false }; return; }
      g.current = { k: "resize", id: s[0], h, start: d, b0: boxOf(d.objects[s[0]] as any), cp: false }; return;
    }
    if (t === "select") {
      const id = hitTest(d, w, tol());
      const now = Date.now(), dbl = e.detail >= 2 || (lastClick.current.id === id && now - lastClick.current.t < 350 && id);
      lastClick.current = { t: now, id: id ?? "" };
      if (id && dbl && textual(d.objects[id])) { g.current = null; startEdit(id); return; }
      if (id) {
        const shift = e.shiftKey || e.metaKey || e.ctrlKey;
        let ids = s;
        if (shift) { ids = s.includes(id) ? s.filter(i => i !== id) : [...s, id]; setSel(ids); if (!ids.includes(id)) { g.current = null; return; } }
        else if (!s.includes(id)) { ids = [id]; setSel(ids); }
        g.current = { k: "move", ids: withFrameChildren(d, ids), start: d, w0: w, cp: false, dup: e.altKey, clickId: id, shift, moved: false };
      } else { g.current = { k: "marquee", w0: w, base: e.shiftKey ? s : [] }; if (!e.shiftKey) setSel([]); }
      return;
    }
    if (t === "pen") { g.current = { k: "pen", pts: [w] }; setDraft({ kind: "pen", pts: [w] }); return; }
    if (t === "eraser") { g.current = { k: "erase", cp: false, start: d }; return; }
    if (t === "connector") {
      const id = hitTest(d, w, tol(), new Set(d.order.filter(i => { const o = d.objects[i]; return o.type === "connector" || o.type === "pen" || o.type === "frame"; })));
      const from: End = id ? { id } : { x: w.x, y: w.y };
      g.current = { k: "conn", from, fromPt: w, dot: null, moved: false }; setDraft({ kind: "conn", a: w, b: w }); return;
    }
    if (t === "sticky" || t === "text") { const o = newFrom(w.x, w.y, t); commitDoc(addObjects(d, [o])); startEdit(o.id, true); backToSelect(); return; }
    g.current = { k: "draw", tool: t, w0: w }; setDraft({ kind: "box", tool: t, box: { x: w.x, y: w.y, w: 0, h: 0 } });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const gg = g.current; if (!gg) return;
    const { doc: d, view: v } = R.current;
    if (gg.k === "pan") { setView(panBy(gg.v, e.clientX - gg.sx, e.clientY - gg.sy)); return; }
    const w = toWorld(e);
    switch (gg.k) {
      case "move": {
        let dx = w.x - gg.w0.x, dy = w.y - gg.w0.y;
        if (!gg.moved && Math.hypot(dx, dy) * v.zoom < 3) return;
        if (!gg.cp) {
          gg.cp = true; gg.moved = true;
          if (gg.dup) { const c = cloneObjects(gg.start, gg.ids, 0, 0); gg.start = addObjects(gg.start, c.objs); gg.ids = c.ids; setSel(c.ids.filter(i => gg.start.objects[i].type !== "connector" || true)); }
          begin();
        }
        const movingSet = new Set(gg.ids);
        const moving = unionBox(gg.ids.map(i => gg.start.objects[i]).filter(o => o && isBox(o)).map(o => boxOf(o as any)));
        let gl: Guide[] = [];
        if (moving && !e.metaKey && !e.ctrlKey) {
          const others = gg.start.order.filter(i => !movingSet.has(i) && gg.start.objects[i].type !== "connector" && gg.start.objects[i].type !== "frame").map(i => boxOf(gg.start.objects[i] as any));
          const r = snapBox({ ...moving, x: moving.x + dx, y: moving.y + dy }, others, 6 / v.zoom); dx += r.dx; dy += r.dy; gl = r.guides;
        }
        setGuides(gl); liveDoc(moveObjects(gg.start, gg.ids, dx, dy)); return;
      }
      case "resize": {
        const dx = w.x - handlePt(gg.b0, gg.h).x, dy = w.y - handlePt(gg.b0, gg.h).y;
        if (!gg.cp) { gg.cp = true; begin(); }
        let { x, y, w: bw, h: bh } = gg.b0;
        if (gg.h.includes("e")) bw += dx; if (gg.h.includes("s")) bh += dy; if (gg.h.includes("w")) { x += dx; bw -= dx; } if (gg.h.includes("n")) { y += dy; bh -= dy; }
        if (e.shiftKey && gg.h.length === 2 && gg.b0.w && gg.b0.h) { const r = gg.b0.w / gg.b0.h; if (bw / bh > r) bh = bw / r; else bw = bh * r; if (gg.h.includes("w")) x = gg.b0.x + gg.b0.w - bw; if (gg.h.includes("n")) y = gg.b0.y + gg.b0.h - bh; }
        liveDoc(resizeObject(gg.start, gg.id, { x, y, w: bw, h: bh })); return;
      }
      case "marquee": { const b = normBox(gg.w0, w); setMarq(b); const hit = marquee(d, b); setSel([...new Set([...gg.base, ...hit])]); return; }
      case "draw": setDraft({ kind: "box", tool: gg.tool, box: normBox(gg.w0, w) }); return;
      case "pen": gg.pts.push(w); setDraft({ kind: "pen", pts: gg.pts.slice() }); return;
      case "conn": {
        if (!gg.moved && Math.hypot(w.x - gg.fromPt.x, w.y - gg.fromPt.y) * v.zoom < 5) return; gg.moved = true;
        setDraft({ kind: "conn", a: gg.fromPt, b: w }); return;
      }
      case "cend": {
        if (!gg.cp) { gg.cp = true; begin(); }
        const id = hitTest(d, w, tol(), new Set([gg.id]));
        const tgt = id && isBox(d.objects[id]) && d.objects[id].type !== "pen" && d.objects[id].type !== "frame" ? id : null;
        liveDoc(updateObjects(d, [gg.id], { [gg.which]: tgt ? { id: tgt } : { x: w.x, y: w.y } } as Partial<Obj>)); return;
      }
      case "erase": {
        const id = hitTest(d, w, tol() + 2); if (!id) return;
        if (!gg.cp) { gg.cp = true; begin(); }
        liveDoc(removeObjects(d, [id])); return;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const gg = g.current; g.current = null; if (!gg) return;
    const { doc: d, view: v } = R.current, w = toWorld(e);
    setGuides([]); setMarq(null);
    switch (gg.k) {
      case "move": if (!gg.moved && !gg.shift && R.current.sel.length > 1 && gg.clickId) setSel([gg.clickId]); return;
      case "draw": {
        setDraft(null);
        const b = normBox(gg.w0, w), tiny = b.w * v.zoom < 8 && b.h * v.zoom < 8;
        let o: Obj;
        if (gg.tool === "frame") { const fb = tiny ? { x: gg.w0.x - 240, y: gg.w0.y - 160, w: 480, h: 320 } : b; o = frame(fb.x, fb.y, fb.w, fb.h, `Frame ${d.order.filter(i => d.objects[i].type === "frame").length + 1}`); commitDoc(addObjects(d, [o])); setSel([o.id]); startEdit(o.id, true); backToSelect(); return; }
        o = newFrom(gg.w0.x, gg.w0.y, gg.tool); if (!tiny) o = sizeFor(o, { x: b.x, y: b.y, w: Math.max(40, b.w), h: Math.max(30, b.h) });
        commitDoc(addObjects(d, [o])); startEdit(o.id, true); backToSelect(); return;
      }
      case "pen": {
        setDraft(null); const pts = simplify(gg.pts, 1.2 / v.zoom);
        if (pts.length < 2 && gg.pts.length < 2) { const o = pen([w, { x: w.x + 0.1, y: w.y }], last.current.penColor, last.current.penWidth); commitDoc(addObjects(d, [o])); return; }
        const o = pen(pts.length < 2 ? gg.pts : pts, last.current.penColor, last.current.penWidth); commitDoc(addObjects(d, [o])); setSel([o.id]); return;
      }
      case "conn": {
        setDraft(null);
        const skip = new Set(d.order.filter(i => { const o = d.objects[i]; return o.type === "connector" || o.type === "pen" || o.type === "frame"; }));
        const id = hitTest(d, w, tol(), skip);
        if (gg.dot && !gg.moved) { const r = createConnected(d, gg.dot.id, gg.dot.side); if (r) { commitDoc(r.doc); startEdit(r.id, true); } return; }
        const to: End = id ? (gg.dot && id === gg.dot.id ? { x: w.x, y: w.y } : { id }) : { x: w.x, y: w.y };
        if (gg.dot && !id) { // dragged into empty space: drop a connected clone there (Miro's picker, "same object" choice)
          const src = d.objects[gg.dot.id] as Obj; if (isBox(src)) { const c = { ...src, id: nid(), text: "", x: w.x - src.w / 2, y: w.y - src.h / 2 } as Obj; const k = connector({ id: gg.dot.id, side: gg.dot.side }, { id: c.id }, { style: last.current.connectorStyle }); commitDoc(addObjects(d, [c, k])); startEdit(c.id, true); } return;
        }
        if (!("id" in gg.from) && !("id" in to) && Math.hypot(w.x - gg.fromPt.x, w.y - gg.fromPt.y) * v.zoom < 10) return;
        const k = connector(gg.from, to, { style: last.current.connectorStyle }); commitDoc(addObjects(d, [k])); setSel([k.id]); backToSelect(); return;
      }
      default: return;
    }
  };

  // wheel: ⌘/ctrl = zoom (also trackpad pinch), otherwise pan
  useEffect(() => {
    const el = box.current!;
    const f = (e: WheelEvent) => {
      if ((e.target as Element).closest("[data-ui]")) return; e.preventDefault();
      const r = el.getBoundingClientRect(), at = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) setView(v => zoomAt(v, R.current.size, at, v.zoom * Math.exp(-e.deltaY * 0.01)));
      else setView(v => panBy(v, -e.deltaX, -e.deltaY));
    };
    el.addEventListener("wheel", f, { passive: false }); return () => el.removeEventListener("wheel", f);
  }, []);

  // ---- keyboard ----
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input,textarea,select,[contenteditable]")) return;
    const { sel: s, doc: d } = R.current, mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (e.code === "Space" && !mod) { e.preventDefault(); setSpace(true); return; }
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && k === "y") { e.preventDefault(); doRedo(); return; }
    if (mod && k === "s") { e.preventDefault(); void saveNow(); flash("Saved"); return; }
    if (mod && k === "a") { e.preventDefault(); setSel(d.order.slice()); return; }
    if (mod && k === "d") { e.preventDefault(); dup(); return; }
    if (mod && k === "c") { copy(false); return; }
    if (mod && k === "x") { e.preventDefault(); copy(true); return; }
    if (mod && k === "v") { if (paste()) e.preventDefault(); return; }
    if (mod && e.key === "]") { e.preventDefault(); commitDoc(bringToFront(d, s)); return; }
    if (mod && e.key === "[") { e.preventDefault(); commitDoc(sendToBack(d, s)); return; }
    if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); zoomBy(1.25); return; }
    if (mod && e.key === "-") { e.preventDefault(); zoomBy(0.8); return; }
    if (mod && e.key === "0") { e.preventDefault(); setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, 1)); return; }
    if (mod) return;
    if (e.key === "Escape") { if (g.current) { g.current = null; setDraft(null); setMarq(null); } else if (R.current.tool !== "select") setTool("select"); else setSel([]); setHelp(false); setMenu(false); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(); return; }
    if (e.key === "?") { setHelp(h => !h); return; }
    if (e.key === "Enter" && s.length === 1 && textual(d.objects[s[0]])) { e.preventDefault(); startEdit(s[0]); return; }
    if (e.key === "Tab" && s.length === 1) {
      const o = d.objects[s[0]]; if (o && (o.type === "sticky" || o.type === "shape")) { e.preventDefault(); const side: Side = e.shiftKey ? "s" : "e"; const r = createConnected(d, o.id, side); if (r) { commitDoc(r.doc); startEdit(r.id, true); } return; }
    }
    if (e.key.startsWith("Arrow") && s.length) { e.preventDefault(); const n = e.shiftKey ? 10 : 1; commitDoc(moveObjects(d, withFrameChildren(d, s), e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0, e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0)); return; }
    if (e.key === "!" || (e.shiftKey && e.code === "Digit1")) { fitAll(); return; }
    if (e.key === "@" || (e.shiftKey && e.code === "Digit2")) { fitSel(); return; }
    if (e.key === "+" || e.key === "=") { zoomBy(1.25); return; }
    if (e.key === "-") { zoomBy(0.8); return; }
    if (k === "m" && !e.shiftKey) { setMap(m => !m); return; }
    if (k === "f" && s.length > 1) { frameSel(); return; }
    if (KEY_TO_TOOL[k] && !e.shiftKey && !e.altKey) { setTool(KEY_TO_TOOL[k]); setEdit(null); }
  };
  useEffect(() => {
    const d = (e: KeyboardEvent) => keys.current(e);
    const u = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    const p = (e: ClipboardEvent) => { // external text paste → sticky at the view centre
      if ((e.target as HTMLElement).closest("input,textarea,[contenteditable]") || R.current.edit) return;
      const text = e.clipboardData?.getData("text/plain")?.trim(); if (!text || text === "MiroIsDead board objects") return;
      e.preventDefault(); const c = R.current.view, o = sticky(c.x - 90, c.y - 90, { text: text.slice(0, 2000), color: last.current.stickyColor });
      commitDoc(addObjects(R.current.doc, [o])); setSel([o.id]);
    };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u); window.addEventListener("paste", p);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); window.removeEventListener("paste", p); };
  }, [commitDoc]);

  // ---- derived UI ----
  const selObjs = sel.map(i => doc.objects[i]).filter(Boolean);
  const selBounds = unionBox(selObjs.map(o => boundsOf(doc, o)));
  const z = view.zoom, px = (n: number) => n / z;
  const one = selObjs.length === 1 ? selObjs[0] : null;
  const sBox = selBounds ? (() => { const a = worldToScreen(view, size, { x: selBounds.x, y: selBounds.y }); return { x: a.x, y: a.y, w: selBounds.w * z, h: selBounds.h * z }; })() : null;
  const hint = edit ? "Esc to finish · Tab for the next sticky · ⇧Tab places it below" : tool !== "select" ? TOOLS.find(t => t.tool === tool)!.hint : one && (one.type === "sticky" || one.type === "shape") ? "Enter to edit · Tab adds a connected one · drag a blue dot to connect" : selObjs.length > 1 ? "Align and distribute from the toolbar · F frames the selection · ⌘D duplicates" : "Scroll to pan · ⌘ + scroll to zoom · N for a sticky · ? for all shortcuts";
  const cursor = g.current?.k === "pan" || (space && true) ? "grab" : tool === "hand" ? "grab" : tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair";
  const gridSize = 24 * z, bgPos = `${size.w / 2 - view.x * z}px ${size.h / 2 - view.y * z}px`;
  const statusText = status === "saving" ? "Saving…" : status === "saved" ? (store.kind === "cloud" ? "Saved to your account" : "Saved on this device") : status === "device" ? "Saved on this device · sync failed" : "Couldn't save";

  return <div className="mi-app" data-testid="board-editor">
    <header className="mi-top" data-ui>
      <Link href="/app" className="mi-tb" aria-label="Back to boards" title="Back to boards">{I.back}</Link>
      <Mark size={24} />
      <input className="mi-title" aria-label="Board title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
      <span className={"mi-status " + status} data-testid="save-status" role="status">{statusText}</span>
      <span className="mi-grow" />
      <button className="mi-tb" disabled={!canUndo(hist)} onClick={doUndo} title="Undo (⌘Z)" aria-label="Undo">{I.undo}</button>
      <button className="mi-tb" disabled={!canRedo(hist)} onClick={doRedo} title="Redo (⇧⌘Z)" aria-label="Redo">{I.redo}</button>
      <div className="mi-menuwrap">
        <button className="mi-btn" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu">{I.download} Export</button>
        {menu && <div className="mi-menu" role="menu" onPointerDown={e => e.stopPropagation()}>
          <button role="menuitem" onClick={() => { download(`${title || "board"}.svg`, "image/svg+xml", boardToSvg(doc)); setMenu(false); }}>Download SVG</button>
          <button role="menuitem" onClick={() => { download(`${title || "board"}.miroisdead.json`, "application/json", serialize(boardRef.current)); setMenu(false); }}>Download board file (.json)</button>
          <button role="menuitem" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(describeScene(boardRef.current), null, 2)).then(() => flash("Scene JSON copied"), () => flash("Couldn't copy")); setMenu(false); }}>Copy scene JSON for an AI agent</button>
        </div>}
      </div>
      <button className="mi-tb" onClick={() => setHelp(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">{I.help}</button>
      <span className="mi-who" title={who}>{who}</span>
      {signOutAction && <form action={signOutAction}><button className="mi-btn ghost">Sign out</button></form>}
    </header>

    <nav className="mi-rail" data-ui aria-label="Tools">
      {TOOLS.map(t => <button key={t.tool} className={"mi-tool" + (tool === t.tool ? " on" : "")} aria-pressed={tool === t.tool} title={`${t.label} (${t.key.toUpperCase()})`} aria-label={t.label} data-tool={t.tool} onClick={() => { setTool(t.tool); setEdit(null); }}>
        {I[t.tool === "rect" ? "rect" : t.tool as keyof typeof I]}<kbd>{t.key.toUpperCase()}</kbd></button>)}
    </nav>

    <div ref={box} className="mi-canvas" tabIndex={0} data-testid="canvas" style={{ cursor, backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: bgPos }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onContextMenu={e => e.preventDefault()}>
      <svg width={size.w} height={size.h} style={{ display: "block", overflow: "hidden" }}>
        <Defs />
        <g transform={`translate(${size.w / 2 - view.x * z} ${size.h / 2 - view.y * z}) scale(${z})`}>
          <Scene doc={doc} editing={edit?.id} />
          {/* selection chrome */}
          {tool === "select" && selObjs.map(o => { const b = boundsOf(doc, o); return o.type === "connector" ? <path key={o.id} d={routeConnector(doc, o).path} fill="none" stroke="#4262FF" strokeWidth={px(5)} opacity={0.25} /> : <rect key={o.id} x={b.x - px(2)} y={b.y - px(2)} width={b.w + px(4)} height={b.h + px(4)} fill="none" stroke="#4262FF" strokeWidth={px(1.5)} rx={px(2)} />; })}
          {tool === "select" && selObjs.length > 1 && selBounds && <rect x={selBounds.x - px(6)} y={selBounds.y - px(6)} width={selBounds.w + px(12)} height={selBounds.h + px(12)} fill="none" stroke="#4262FF" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} />}
          {tool === "select" && one && isBox(one) && !edit && <>
            {HANDLES.map(h => { const p = handlePt(boxOf(one), h), s = px(9); return <rect key={h} data-h={h} data-testid={`handle-${h}`} x={p.x - s / 2} y={p.y - s / 2} width={s} height={s} rx={px(2)} fill="#fff" stroke="#4262FF" strokeWidth={px(1.5)} style={{ cursor: CURSOR[h] }} />; })}
            {(one.type === "sticky" || one.type === "shape") && (["n", "e", "s", "w"] as Side[]).map(sd => { const a = anchorPoint(boxOf(one), sd), off = px(22); return <g key={sd} data-h={`dot:${sd}`} data-testid={`dot-${sd}`} style={{ cursor: "copy" }}><circle cx={a.x + DIR[sd].x * off} cy={a.y + DIR[sd].y * off} r={px(7)} fill="#4262FF" stroke="#fff" strokeWidth={px(1.5)} /><path d={`M${a.x + DIR[sd].x * off - px(3)} ${a.y + DIR[sd].y * off}h${px(6)}M${a.x + DIR[sd].x * off} ${a.y + DIR[sd].y * off - px(3)}v${px(6)}`} stroke="#fff" strokeWidth={px(1.5)} strokeLinecap="round" /></g>; })}
          </>}
          {tool === "select" && one?.type === "connector" && !edit && (() => { const r = resolveConnector(doc, one); return [["ca", r.a], ["cb", r.b]].map(([id, p]) => <circle key={id as string} data-h={id as string} data-testid={`conn-${id}`} cx={(p as Pt).x} cy={(p as Pt).y} r={px(7)} fill="#fff" stroke="#4262FF" strokeWidth={px(2)} style={{ cursor: "grab" }} />); })()}
          {/* snapping guides, marquee, drafts */}
          {guides.map((gd, i) => gd.axis === "x" ? <line key={i} x1={gd.at} x2={gd.at} y1={gd.from - px(12)} y2={gd.to + px(12)} stroke="#E0457B" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} /> : <line key={i} y1={gd.at} y2={gd.at} x1={gd.from - px(12)} x2={gd.to + px(12)} stroke="#E0457B" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} />)}
          {marq && <rect x={marq.x} y={marq.y} width={marq.w} height={marq.h} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={px(1)} />}
          {draft?.kind === "box" && (draft.tool === "frame" ? <rect {...draft.box} fill="rgba(255,255,255,.5)" stroke="#4262FF" strokeWidth={px(1.5)} strokeDasharray={`${px(6)} ${px(4)}`} /> : draft.tool === "sticky" || draft.tool === "text" ? null : <g transform={`translate(${draft.box.x} ${draft.box.y})`}><path d={shapePath(draft.tool === "ellipse" ? "ellipse" : draft.tool === "diamond" ? "diamond" : "rect", draft.box.w, draft.box.h)} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={px(1.5)} strokeDasharray={`${px(6)} ${px(4)}`} /></g>)}
          {draft?.kind === "pen" && <path d={penPath(draft.pts)} fill="none" stroke={last.current.penColor} strokeWidth={last.current.penWidth} strokeLinecap="round" strokeLinejoin="round" />}
          {draft?.kind === "conn" && <path d={`M${draft.a.x} ${draft.a.y}L${draft.b.x} ${draft.b.y}`} stroke="#4262FF" strokeWidth={px(2)} strokeDasharray={`${px(6)} ${px(4)}`} fill="none" />}
        </g>
      </svg>
      {edit && doc.objects[edit.id] && <TextEditor key={edit.id} doc={doc} id={edit.id} view={view} size={size} onDone={finishEdit} />}
      {sBox && !edit && !g.current && tool === "select" && <SelectionToolbar doc={doc} ids={sel} screenBox={sBox} canvas={size} patch={patchSel} onDelete={del} onDuplicate={dup} onFront={() => commitDoc(bringToFront(doc, sel))} onBack={() => commitDoc(sendToBack(doc, sel))} onFrame={frameSel} onAlign={(a: Align) => commitDoc(align(doc, sel, a))} onDistribute={a => commitDoc(distribute(doc, sel, a))} />}
      {doc.order.length === 0 && !edit && <div className="mi-empty" data-testid="empty-hint"><h2>A little room to think.</h2><p>Press <kbd>N</kbd> and click for a sticky note, <kbd>R</kbd> for a shape, <kbd>P</kbd> to draw. <kbd>?</kbd> shows every shortcut.</p></div>}
    </div>

    <div className="mi-hint" data-ui data-testid="hint">{hint}</div>
    <div className="mi-zoom" data-ui>
      <button className="mi-tb" onClick={() => zoomBy(0.8)} aria-label="Zoom out" title="Zoom out (−)">{I.minus}</button>
      <button className="mi-zoomval" onClick={() => setView(v => zoomAt(v, size, { x: size.w / 2, y: size.h / 2 }, 1))} title="Reset to 100% (⌘0)" data-testid="zoom-level">{Math.round(z * 100)}%</button>
      <button className="mi-tb" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (+)">{I.plus}</button>
      <button className="mi-tb" onClick={fitAll} aria-label="Fit all" title="Fit all (⇧1)">{I.fit}</button>
      <button className={"mi-tb" + (map ? " on" : "")} onClick={() => setMap(m => !m)} aria-label="Toggle minimap" aria-pressed={map} title="Minimap (M)">{I.map}</button>
    </div>
    {map && <Minimap doc={doc} view={view} size={size} onJump={(x, y) => setView(v => ({ ...v, x, y }))} />}
    {help && <ShortcutSheet onClose={() => setHelp(false)} />}
    {toast && <div className="mi-toast" role="status">{toast}</div>}
  </div>;
}

/** In-place text editing over the object (stickies shrink-to-fit live while you type). */
function TextEditor({ doc, id, view, size, onDone }: { doc: Doc; id: Id; view: View; size: { w: number; h: number }; onDone: (text: string, then?: "tab" | "shifttab") => void }) {
  const o = doc.objects[id]!; const ref = useRef<HTMLDivElement>(null); const [text, setText] = useState(textOf(o)); const done = useRef(false);
  useLayoutEffect(() => { const el = ref.current!; el.textContent = textOf(o); el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const z = view.zoom, to = (p: Pt) => worldToScreen(view, size, p);
  let b: Box, fs: number, align: "center" | "left" = "center", weight = 400, pad = 14, color = "#1C1C1E", bg = "transparent", singleLine = false;
  if (o.type === "connector") { const c = routeConnector(doc, o).label; b = { x: c.x - 70, y: c.y - 13, w: 140, h: 26 }; fs = 13; singleLine = true; bg = "#fff"; pad = 4; }
  else if (o.type === "frame") { b = { x: o.x, y: o.y - 30, w: Math.max(200, Math.min(o.w, 360)), h: 26 }; fs = 14; weight = 600; align = "left"; singleLine = true; pad = 0; color = "#555A6A"; }
  else { b = boxOf(o as any); if (o.type === "sticky") fs = o.fontSize === "auto" ? fitFontSize(text, o.w, o.h) : o.fontSize; else if (o.type === "shape") fs = o.fontSize; else if (o.type === "text") { fs = o.fontSize; align = "left"; pad = 0; weight = o.bold ? 700 : 400; color = o.color; } else fs = 16; }
  if (o.type === "shape") { const tw = o.shape === "diamond" ? 0.55 : o.shape === "triangle" ? 0.5 : o.shape === "ellipse" ? 0.78 : 0.9; b = { x: o.x + (o.w * (1 - tw)) / 2, y: o.y + 6, w: o.w * tw, h: o.h - 12 }; pad = 2; }
  const p = to({ x: b.x, y: b.y });
  const finish = (then?: "tab" | "shifttab") => { if (done.current) return; done.current = true; onDone(ref.current?.innerText.replace(/\n$/, "") ?? text, then); };
  return <div className="mi-editor" data-ui style={{ left: p.x, top: p.y, width: b.w * z, height: Math.max(b.h * z, fs * z * 1.6), display: "flex", alignItems: o.type === "text" || o.type === "frame" ? "flex-start" : "center", justifyContent: align === "center" ? "center" : "flex-start" }}>
    <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label="Edit text" data-testid="text-editor" spellCheck={false}
      style={{ width: "100%", outline: "none", textAlign: align, fontSize: fs * z, lineHeight: LINE_HEIGHT, fontWeight: weight, padding: pad * z, color, background: bg, whiteSpace: singleLine ? "nowrap" : "pre-wrap", overflowWrap: "anywhere", fontFamily: "var(--ids-font-sans)", caretColor: "#4262FF", borderRadius: 4 }}
      onInput={e => setText((e.target as HTMLElement).innerText)} onBlur={() => finish()}
      onPaste={e => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); finish(); }
        else if (e.key === "Enter" && (e.metaKey || e.ctrlKey || singleLine)) { e.preventDefault(); finish(); }
        else if (e.key === "Tab" && (o.type === "sticky" || o.type === "shape")) { e.preventDefault(); finish(e.shiftKey ? "shifttab" : "tab"); }
        else if (e.key === "Tab") e.preventDefault();
      }} />
  </div>;
}
