"use client";
import React from "react";
import type { Doc, Id, Obj, ShapeKind, Box, ConnectorStyle } from "@/lib/canvas/types";
import { INK_COLORS, SHAPE_FILLS, STICKY_COLORS } from "@/lib/canvas/types";
import type { Align } from "@/lib/canvas/doc";
import { I } from "./icons";

type Props = {
  doc: Doc; ids: Id[]; screenBox: Box; canvas: { w: number; h: number };
  patch: (p: Partial<Obj> | ((o: Obj) => Partial<Obj>), remember?: Record<string, unknown>) => void;
  onDelete: () => void; onDuplicate: () => void; onFront: () => void; onBack: () => void; onFrame: () => void; onAlign: (a: Align) => void; onDistribute: (axis: "h" | "v") => void;
};
const Swatches = ({ colors, value, onPick, label }: { colors: readonly string[]; value?: string; onPick: (c: string) => void; label: string }) =>
  <div className="mi-swatches" role="group" aria-label={label}>{colors.map(c => <button key={c} type="button" className={"mi-sw" + (value?.toLowerCase() === c.toLowerCase() ? " on" : "")} style={{ background: c }} aria-label={`${label} ${c}`} onClick={() => onPick(c)} />)}</div>;
const Btn = ({ children, title, on, onClick }: { children: React.ReactNode; title: string; on?: boolean; onClick: () => void }) =>
  <button type="button" className={"mi-tb" + (on ? " on" : "")} title={title} aria-label={title} aria-pressed={on} onClick={onClick}>{children}</button>;
const Sep = () => <span className="mi-sep" />;
const SHAPES: { k: ShapeKind; label: string; i: React.ReactNode }[] = [{ k: "rect", label: "Rectangle", i: I.rect }, { k: "round", label: "Rounded", i: I.rect }, { k: "ellipse", label: "Ellipse", i: I.ellipse }, { k: "diamond", label: "Diamond", i: I.diamond }, { k: "triangle", label: "Triangle", i: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 4l9 16H3z" /></svg> }];

export function SelectionToolbar({ doc, ids, screenBox, canvas, patch, onDelete, onDuplicate, onFront, onBack, onFrame, onAlign, onDistribute }: Props) {
  const objs = ids.map(i => doc.objects[i]).filter(Boolean);
  if (!objs.length) return null;
  const types = new Set(objs.map(o => o.type)), one = objs.length === 1 ? objs[0] : null;
  const W = 340, left = Math.min(Math.max(8, screenBox.x + screenBox.w / 2 - W / 2), canvas.w - W - 8);
  const above = screenBox.y - 62, top = above < 8 ? Math.min(canvas.h - 60, screenBox.y + screenBox.h + 14) : above;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return <div className="mi-floattb" style={{ left, top }} data-testid="selection-toolbar" onPointerDown={stop} onDoubleClick={stop}>
    {types.size === 1 && one?.type === "sticky" && <>
      <Swatches colors={STICKY_COLORS} value={one.color} label="Sticky colour" onPick={c => patch({ color: c }, { stickyColor: c })} />
      <Sep />{(["auto", 14, 20, 28] as const).map(s => <Btn key={s} title={s === "auto" ? "Auto text size" : `Text size ${s}`} on={one.fontSize === s} onClick={() => patch({ fontSize: s })}><b style={{ fontSize: s === "auto" ? 12 : s === 14 ? 11 : s === 20 ? 14 : 17 }}>{s === "auto" ? "Auto" : "A"}</b></Btn>)}
    </>}
    {types.size === 1 && one?.type === "shape" && <>
      {SHAPES.map(s => <Btn key={s.k} title={s.label} on={one.shape === s.k} onClick={() => patch({ shape: s.k }, { shape: s.k })}>{s.i}</Btn>)}<Sep />
      <Swatches colors={SHAPE_FILLS} value={one.filled ? one.fill : undefined} label="Fill" onPick={c => patch({ fill: c, filled: true }, { fill: c })} />
      <Sep /><Btn title="No fill" on={!one.filled} onClick={() => patch({ filled: !one.filled })}>{I.rect}</Btn>
      <Btn title="Dashed outline" on={one.dashed} onClick={() => patch({ dashed: !one.dashed })}><b style={{ fontSize: 13 }}>┄</b></Btn>
      <Sep /><Swatches colors={INK_COLORS.slice(0, 6)} value={one.stroke} label="Outline" onPick={c => patch({ stroke: c }, { stroke: c })} />
    </>}
    {types.size === 1 && one?.type === "text" && <>
      <Swatches colors={INK_COLORS} value={one.color} label="Text colour" onPick={c => patch({ color: c }, { textColor: c })} /><Sep />
      {[16, 20, 32, 48].map(s => <Btn key={s} title={`Text size ${s}`} on={one.fontSize === s} onClick={() => patch({ fontSize: s })}><b style={{ fontSize: 10 + s / 6 }}>A</b></Btn>)}
      <Btn title="Bold" on={one.bold} onClick={() => patch({ bold: !one.bold })}><b>B</b></Btn>
    </>}
    {types.size === 1 && one?.type === "pen" && <>
      <Swatches colors={INK_COLORS.slice(0, 7)} value={one.stroke} label="Stroke colour" onPick={c => patch({ stroke: c }, { penColor: c })} /><Sep />
      {[2, 4, 8].map(w => <Btn key={w} title={`Stroke ${w}`} on={one.width === w} onClick={() => patch({ width: w }, { penWidth: w })}><span style={{ display: "block", width: 16, height: w, background: "currentColor", borderRadius: 4 }} /></Btn>)}
    </>}
    {types.size === 1 && one?.type === "connector" && <>
      {(["elbow", "straight", "curve"] as ConnectorStyle[]).map(s => <Btn key={s} title={`${s[0].toUpperCase() + s.slice(1)} line`} on={one.style === s} onClick={() => patch({ style: s }, { connectorStyle: s })}><b style={{ fontSize: 12 }}>{s === "elbow" ? "⌐" : s === "straight" ? "╱" : "∿"}</b></Btn>)}<Sep />
      <Btn title="Arrow at start" on={one.startArrow} onClick={() => patch({ startArrow: !one.startArrow })}><b>◂</b></Btn>
      <Btn title="Arrow at end" on={one.endArrow} onClick={() => patch({ endArrow: !one.endArrow })}><b>▸</b></Btn>
      <Btn title="Dashed" on={one.dashed} onClick={() => patch({ dashed: !one.dashed })}><b style={{ fontSize: 13 }}>┄</b></Btn>
      <Sep /><Swatches colors={INK_COLORS.slice(0, 6)} value={one.stroke} label="Line colour" onPick={c => patch({ stroke: c })} />
    </>}
    {types.size === 1 && one?.type === "frame" && <span className="mi-tbnote">Frame · double-click to rename</span>}
    {objs.length > 1 && <>
      <span className="mi-tbnote" data-testid="selection-count">{objs.length} selected</span><Sep />
      {([["left", "Align left"], ["center", "Align centre"], ["right", "Align right"], ["top", "Align top"], ["middle", "Align middle"], ["bottom", "Align bottom"]] as [Align, string][]).map(([a, t]) =>
        <Btn key={a} title={t} onClick={() => onAlign(a)}><b style={{ fontSize: 11 }}>{({ left: "⇤", center: "↔", right: "⇥", top: "⤒", middle: "↕", bottom: "⤓" })[a]}</b></Btn>)}
      <Btn title="Distribute horizontally" onClick={() => onDistribute("h")}><b style={{ fontSize: 11 }}>⇹</b></Btn>
      <Btn title="Distribute vertically" onClick={() => onDistribute("v")}><b style={{ fontSize: 11 }}>⇳</b></Btn>
      <Sep /><Btn title="Frame selection (F)" onClick={onFrame}>{I.frame}</Btn>
    </>}
    <Sep />
    <Btn title="Bring to front (⌘])" onClick={onFront}>{I.front}</Btn><Btn title="Send to back (⌘[)" onClick={onBack}>{I.back2}</Btn>
    <Btn title="Duplicate (⌘D)" onClick={onDuplicate}>{I.copy}</Btn><Btn title="Delete (⌫)" onClick={onDelete}>{I.trash}</Btn>
  </div>;
}
