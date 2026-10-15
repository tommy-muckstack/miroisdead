import type { Box, Pt, View } from "./types";
import { clamp } from "./geometry";
export const MIN_ZOOM = 0.1, MAX_ZOOM = 6;
export type Size = { w: number; h: number };
/** View.x/y is the world point shown at the screen centre. */
export const screenToWorld = (v: View, s: Size, p: Pt): Pt => ({ x: (p.x - s.w / 2) / v.zoom + v.x, y: (p.y - s.h / 2) / v.zoom + v.y });
export const worldToScreen = (v: View, s: Size, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + s.w / 2, y: (p.y - v.y) * v.zoom + s.h / 2 });
/** Zoom keeping the world point under `at` (screen coords) fixed. */
export function zoomAt(v: View, s: Size, at: Pt, nextZoom: number): View {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM), w = screenToWorld(v, s, at);
  return { zoom, x: w.x - (at.x - s.w / 2) / zoom, y: w.y - (at.y - s.h / 2) / zoom };
}
export const panBy = (v: View, dxScreen: number, dyScreen: number): View => ({ ...v, x: v.x - dxScreen / v.zoom, y: v.y - dyScreen / v.zoom });
/** Fit a world box into the screen with padding (never zooms in past 100%). */
export function fitView(b: Box | null, s: Size, pad = 80): View {
  if (!b || b.w + b.h === 0) return { x: 0, y: 0, zoom: 1 };
  const zoom = clamp(Math.min((s.w - pad * 2) / Math.max(1, b.w), (s.h - pad * 2) / Math.max(1, b.h)), MIN_ZOOM, 1);
  return { zoom, x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
export const visibleWorldBox = (v: View, s: Size): Box => ({ x: v.x - s.w / 2 / v.zoom, y: v.y - s.h / 2 / v.zoom, w: s.w / v.zoom, h: s.h / v.zoom });
