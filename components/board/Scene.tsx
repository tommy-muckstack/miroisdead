import React from "react";
import type { ConnectorObj, Doc, FrameObj, Id, Obj, PenObj, ShapeObj, StickyObj, TextObj } from "@/lib/canvas/types";
import { LINE_HEIGHT, fitFontSize, wrapText } from "@/lib/canvas/text";
import { routeConnector } from "@/lib/canvas/connectors";
import { renderOrder } from "@/lib/canvas/doc";

const FONT = 'var(--ids-font-sans, "Noto Sans", system-ui, sans-serif)';
const fitCache = new Map<string, number>();
const fitted = (text: string, w: number, h: number) => { const k = `${w}|${h}|${text}`; let v = fitCache.get(k); if (v === undefined) { v = fitFontSize(text, w, h); if (fitCache.size > 2000) fitCache.clear(); fitCache.set(k, v); } return v; };

/** Centered multi-line text (stickies, shapes). */
export function Lines({ text, cx, cy, w, size, fill = "#1C1C1E", bold = false, maxH }: { text: string; cx: number; cy: number; w: number; size: number; fill?: string; bold?: boolean; maxH?: number }) {
  if (!text) return null;
  const lines = wrapText(text, w, size, undefined, bold), lh = size * LINE_HEIGHT, top = cy - ((lines.length - 1) * lh) / 2;
  void maxH;
  return <text textAnchor="middle" fontFamily={FONT} fontSize={size} fontWeight={bold ? 700 : 400} fill={fill} style={{ userSelect: "none", pointerEvents: "none" }}>
    {lines.map((l, i) => <tspan key={i} x={cx} y={top + i * lh} dominantBaseline="central">{l || " "}</tspan>)}
  </text>;
}

export const shapePath = (s: ShapeObj["shape"], w: number, h: number): string => {
  switch (s) {
    case "ellipse": return `M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z`;
    case "diamond": return `M${w / 2} 0L${w} ${h / 2}L${w / 2} ${h}L0 ${h / 2}Z`;
    case "triangle": return `M${w / 2} 0L${w} ${h}L0 ${h}Z`;
    case "round": { const r = Math.min(h / 2, w / 2); return `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 ${r} 0Z`; }
    default: { const r = 6; return `M${r} 0H${w - r}Q${w} 0 ${w} ${r}V${h - r}Q${w} ${h} ${w - r} ${h}H${r}Q0 ${h} 0 ${h - r}V${r}Q0 0 ${r} 0Z`; }
  }
};
const textBox = (s: ShapeObj["shape"], w: number, h: number) => (s === "diamond" ? { w: w * 0.55, h: h * 0.5 } : s === "triangle" ? { w: w * 0.5, h: h * 0.5 } : s === "ellipse" ? { w: w * 0.78, h: h * 0.7 } : { w: w - 20, h: h - 12 });

const StickyView = React.memo(function StickyView({ o, hide }: { o: StickyObj; hide: boolean }) {
  const size = o.fontSize === "auto" ? fitted(o.text, o.w, o.h) : o.fontSize;
  return <g transform={`translate(${o.x} ${o.y})`} data-obj={o.id}>
    <rect width={o.w} height={o.h} rx={3} fill={o.color} filter="url(#mi-shadow)" />
    {!hide && <Lines text={o.text} cx={o.w / 2} cy={o.h / 2} w={o.w - 28} size={size} />}
  </g>;
});
const ShapeView = React.memo(function ShapeView({ o, hide }: { o: ShapeObj; hide: boolean }) {
  const tb = textBox(o.shape, o.w, o.h);
  return <g transform={`translate(${o.x} ${o.y})`} data-obj={o.id}>
    <path d={shapePath(o.shape, o.w, o.h)} fill={o.filled ? o.fill : "none"} stroke={o.stroke} strokeWidth={2} strokeDasharray={o.dashed ? "8 6" : undefined} strokeLinejoin="round" />
    {!hide && <Lines text={o.text} cx={o.w / 2} cy={o.h / 2} w={tb.w} size={o.fontSize} />}
  </g>;
});
const TextView = React.memo(function TextView({ o, hide }: { o: TextObj; hide: boolean }) {
  if (hide || !o.text) return <g data-obj={o.id}><rect x={o.x} y={o.y} width={o.w} height={o.h} fill="transparent" /></g>;
  const lines = wrapText(o.text, o.w, o.fontSize, undefined, o.bold), lh = o.fontSize * LINE_HEIGHT;
  return <g data-obj={o.id}><text fontFamily={FONT} fontSize={o.fontSize} fontWeight={o.bold ? 700 : 400} fill={o.color} style={{ userSelect: "none", pointerEvents: "none" }}>
    {lines.map((l, i) => <tspan key={i} x={o.x} y={o.y + lh / 2 + i * lh} dominantBaseline="central">{l || " "}</tspan>)}</text></g>;
});
const FrameView = React.memo(function FrameView({ o, hide }: { o: FrameObj; hide: boolean }) {
  return <g data-obj={o.id}>
    <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={4} fill="#FFFFFF" fillOpacity={0.55} stroke="#C7CAD5" strokeWidth={1.5} />
    {!hide && <text x={o.x} y={o.y - 8} fontFamily={FONT} fontSize={14} fontWeight={600} fill="#555A6A" style={{ userSelect: "none", pointerEvents: "none" }}>{o.name}</text>}
  </g>;
});
export const penPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}l0.01 0`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) d += `Q${pts[i].x} ${pts[i].y} ${(pts[i].x + pts[i + 1].x) / 2} ${(pts[i].y + pts[i + 1].y) / 2}`;
  const l = pts[pts.length - 1]; return d + `L${l.x} ${l.y}`;
};
const PenView = React.memo(function PenView({ o }: { o: PenObj }) {
  return <path data-obj={o.id} transform={`translate(${o.x} ${o.y})`} d={penPath(o.points)} fill="none" stroke={o.stroke} strokeWidth={o.width} strokeLinecap="round" strokeLinejoin="round" />;
});
function Arrow({ at, dir, color }: { at: { x: number; y: number }; dir: { x: number; y: number }; color: string }) {
  const L = 11, W = 6, bx = at.x - dir.x * L, by = at.y - dir.y * L;
  return <path d={`M${at.x} ${at.y}L${bx - dir.y * W} ${by + dir.x * W}L${bx + dir.y * W} ${by - dir.x * W}Z`} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />;
}
export function ConnectorView({ doc, o, hideLabel }: { doc: Doc; o: ConnectorObj; hideLabel?: boolean }) {
  const r = routeConnector(doc, o), pts = r.points;
  const labelW = o.label ? Math.max(28, o.label.length * 8 + 14) : 0;
  return <g data-obj={o.id}>
    <path d={r.path} fill="none" stroke={o.stroke} strokeWidth={2} strokeDasharray={o.dashed ? "8 6" : undefined} strokeLinecap="round" />
    {o.endArrow && <Arrow at={pts[pts.length - 1]} dir={r.endDir} color={o.stroke} />}
    {o.startArrow && <Arrow at={pts[0]} dir={r.startDir} color={o.stroke} />}
    {o.label && !hideLabel && <g><rect x={r.label.x - labelW / 2} y={r.label.y - 11} width={labelW} height={22} rx={11} fill="#FFFFFF" stroke="#E0E2E8" /><text x={r.label.x} y={r.label.y} textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={13} fill="#1C1C1E" style={{ userSelect: "none" }}>{o.label}</text></g>}
  </g>;
}

export function Defs() {
  return <defs><filter id="mi-shadow" x="-10%" y="-10%" width="120%" height="125%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.5" /><feOffset dy="2" result="b" /><feFlood floodColor="#1C1C1E" floodOpacity="0.18" /><feComposite in2="b" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter><pattern id="mi-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#F2F2F4" /><line x1="0" y1="0" x2="0" y2="10" stroke="#D9DBE3" strokeWidth="4" /></pattern></defs>;
}
/** Renders every object of a doc as SVG children. Shared by the editor, board thumbnails and SVG export. */
export function Scene({ doc, editing }: { doc: Doc; editing?: Id | null }) {
  const order = renderOrder(doc), boxes = order.filter(i => doc.objects[i].type !== "connector"), conns = order.filter(i => doc.objects[i].type === "connector");
  const view = (o: Obj) => {
    const hide = editing === o.id;
    switch (o.type) {
      case "sticky": return <StickyView key={o.id} o={o} hide={hide} />; case "shape": return <ShapeView key={o.id} o={o} hide={hide} />;
      case "text": return <TextView key={o.id} o={o} hide={hide} />; case "frame": return <FrameView key={o.id} o={o} hide={hide} />;
      case "pen": return <PenView key={o.id} o={o} />; case "connector": return <ConnectorView key={o.id} doc={doc} o={o} hideLabel={hide} />;
    }
  };
  return <>{boxes.map(i => view(doc.objects[i]))}{conns.map(i => view(doc.objects[i]))}</>;
}
