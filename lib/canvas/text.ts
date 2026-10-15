// Text measuring/wrapping shared by the canvas, SVG export and tests.
export type Measure = (text: string, fontSize: number, bold?: boolean) => number;
let ctx: CanvasRenderingContext2D | null | undefined;
/** Real measurement in the browser (Noto Sans stack), 0.56em average glyph width elsewhere (tests, server). */
export const measureText: Measure = (text, fontSize, bold) => {
  if (ctx === undefined) { try { ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null; } catch { ctx = null; } }
  if (!ctx) return text.length * fontSize * 0.56;
  ctx.font = `${bold ? 700 : 400} ${fontSize}px "IsDead Noto Sans", "Noto Sans", system-ui, sans-serif`;
  return ctx.measureText(text).width;
};
export const LINE_HEIGHT = 1.28;

/** Greedy word wrap. Honours explicit newlines and breaks words longer than the line. */
export function wrapText(text: string, maxWidth: number, fontSize: number, measure: Measure = measureText, bold = false): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (para === "") { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const trial = line + word;
      if (measure(trial.trimEnd(), fontSize, bold) <= maxWidth || line === "") {
        if (measure(trial.trimEnd(), fontSize, bold) > maxWidth && line === "") { // single overlong word: break by characters
          let chunk = "";
          for (const ch of word) { if (measure(chunk + ch, fontSize, bold) > maxWidth && chunk) { out.push(chunk); chunk = ch; } else chunk += ch; }
          line = chunk;
        } else line = trial;
      } else { out.push(line.trimEnd()); line = word.trimStart(); }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** Miro-style "Auto" size: the largest font size (28 → 10, steps of 2) whose wrapped text fits the box. */
export function fitFontSize(text: string, w: number, h: number, measure: Measure = measureText, pad = 14, max = 28, min = 10): number {
  for (let s = max; s > min; s -= 2) {
    const lines = wrapText(text || " ", w - pad * 2, s, measure);
    if (lines.length * s * LINE_HEIGHT <= h - pad * 2) return s;
  }
  return min;
}
