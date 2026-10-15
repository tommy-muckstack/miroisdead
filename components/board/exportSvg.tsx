import { renderToStaticMarkup } from "react-dom/server";
import type { Doc } from "@/lib/canvas/types";
import { unionBox } from "@/lib/canvas/geometry";
import { boundsOf } from "@/lib/canvas/connectors";
import { Defs, Scene } from "./Scene";

/** Standalone SVG of the whole board (also used for dashboard thumbnails). */
export function boardToSvg(doc: Doc, opts: { pad?: number; background?: string | null; maxW?: number } = {}): string {
  const u = unionBox(doc.order.map(i => boundsOf(doc, doc.objects[i]))) ?? { x: 0, y: 0, w: 400, h: 300 };
  const pad = opts.pad ?? 40, x = u.x - pad, y = u.y - pad - 20, w = Math.max(80, u.w + pad * 2), h = Math.max(60, u.h + pad * 2 + 20);
  const inner = renderToStaticMarkup(<svg><Defs /><Scene doc={doc} /></svg>).replace(/^<svg>/, "").replace(/<\/svg>$/, "");
  const bg = opts.background === undefined ? "#FAFAFC" : opts.background;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${opts.maxW ? ` width="${opts.maxW}" height="${Math.round((opts.maxW * h) / w)}"` : ""} font-family="Noto Sans, system-ui, sans-serif">${bg ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` : ""}${inner}</svg>`;
}
