"use client";
import React from "react";
import type { Doc, View } from "@/lib/canvas/types";
import { unionBox } from "@/lib/canvas/geometry";
import { boundsOf } from "@/lib/canvas/connectors";
import { visibleWorldBox } from "@/lib/canvas/viewport";

const COLOR: Record<string, string> = { sticky: "#E0A800", shape: "#4262FF", text: "#555A6A", frame: "#C7CAD5", pen: "#1C1C1E", connector: "#8A8FA3" };
export function Minimap({ doc, view, size, onJump }: { doc: Doc; view: View; size: { w: number; h: number }; onJump: (x: number, y: number) => void }) {
  const vis = visibleWorldBox(view, size);
  const boxes = doc.order.map(i => ({ o: doc.objects[i], b: boundsOf(doc, doc.objects[i]) }));
  const all = unionBox([vis, ...boxes.map(x => x.b)])!, pad = Math.max(all.w, all.h) * 0.05;
  const vb = { x: all.x - pad, y: all.y - pad, w: all.w + pad * 2, h: all.h + pad * 2 };
  return <div className="mi-minimap" data-testid="minimap" onPointerDown={e => e.stopPropagation()}>
    <svg width="100%" height="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" onPointerDown={e => {
      const svg = e.currentTarget, r = svg.getBoundingClientRect(), s = Math.min(r.width / vb.w, r.height / vb.h);
      const ox = (r.width - vb.w * s) / 2, oy = (r.height - vb.h * s) / 2;
      onJump(vb.x + (e.clientX - r.left - ox) / s, vb.y + (e.clientY - r.top - oy) / s);
    }}>
      {boxes.filter(x => x.o.type !== "connector").map(({ o, b }) => <rect key={o.id} x={b.x} y={b.y} width={Math.max(b.w, vb.w / 120)} height={Math.max(b.h, vb.w / 120)} fill={o.type === "frame" ? "none" : o.type === "sticky" ? o.color : COLOR[o.type]} stroke={o.type === "frame" ? "#C7CAD5" : "none"} strokeWidth={vb.w / 300} opacity={0.9} />)}
      <rect x={vis.x} y={vis.y} width={vis.w} height={vis.h} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={vb.w / 160} />
    </svg>
  </div>;
}
