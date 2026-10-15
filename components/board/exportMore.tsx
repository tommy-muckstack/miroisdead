// Extra export paths matched to Miro's export menu: PDF (print window), PNG (rasterised SVG), CSV (text content), custom templates.
import type { Board, Doc } from "@/lib/canvas/types";
import { serialize } from "@/lib/canvas/board";

/** Rasterise a standalone SVG string to a PNG blob at `scale`× (fonts fall back to the system sans in the image). */
export function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/); if (!m) return reject(new Error("no viewBox"));
    const w = Math.ceil(+m[3]), h = Math.ceil(+m[4]);
    const img = new Image(); const url = URL.createObjectURL(new Blob([svg.replace("<svg ", `<svg width="${w}" height="${h}" `)], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => { const c = document.createElement("canvas"); c.width = Math.min(8192, w * scale); c.height = Math.min(8192, h * scale); const g = c.getContext("2d")!; g.fillStyle = "#FAFAFC"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("svg load failed")); }; img.src = url;
  });
}
/** Opens the board in a print-ready window so the browser's "Save as PDF" produces the PDF (no server, no paid service). */
export function openPrintWindow(title: string, svg: string) {
  const w = window.open("", "_blank", "noopener,width=1100,height=800"); if (!w) return;
  w.document.write(`<!doctype html><title>${title.replace(/</g, "&lt;")}</title><style>@page{size:auto;margin:12mm}html,body{margin:0;background:#fff}svg{width:100%;height:auto;max-height:95vh;display:block}</style>${svg}<script>setTimeout(()=>{print();},300)</script>`);
  w.document.close();
}
const csvCell = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
/** One row per object with text: type, text, colour, position, size, frame. */
export function boardToCsv(doc: Doc): string {
  const frames = doc.order.map(i => doc.objects[i]).filter(o => o.type === "frame") as { x: number; y: number; w: number; h: number; name: string }[];
  const rows = [["Type", "Text", "Colour", "X", "Y", "Width", "Height", "Frame"]];
  for (const id of doc.order) {
    const o = doc.objects[id]; if (o.type === "connector" || o.type === "pen" || o.type === "comment") continue;
    const text = o.type === "frame" ? o.name : o.text; const colour = o.type === "sticky" ? o.color : o.type === "shape" ? o.fill : o.type === "text" ? o.color : "";
    const inFrame = frames.find(f => o.type !== "frame" && o.x + o.w / 2 >= f.x && o.x + o.w / 2 <= f.x + f.w && o.y + o.h / 2 >= f.y && o.y + o.h / 2 <= f.y + f.h)?.name ?? "";
    rows.push([o.type === "sticky" ? "Sticky note" : o.type === "shape" ? "Shape" : o.type === "text" ? "Text" : "Frame", text, colour, String(Math.round(o.x)), String(Math.round(o.y)), String(Math.round(o.w)), String(Math.round(o.h)), inFrame]);
  }
  return "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
}
export const TEMPLATES_KEY = "miroisdead:v1:custom-templates";
export type CustomTemplate = { id: string; name: string; savedAt: number; board: string };
export function listCustomTemplates(): CustomTemplate[] { try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "[]"); } catch { return []; } }
export function saveCustomTemplate(b: Board) {
  const list = listCustomTemplates().filter(t => t.id !== b.id); list.unshift({ id: b.id, name: b.title || "Untitled template", savedAt: Date.now(), board: serialize(b) });
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list.slice(0, 50))); } catch { /* quota */ }
}
export function removeCustomTemplate(id: string) { try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(listCustomTemplates().filter(t => t.id !== id))); } catch { /* ignore */ } }
