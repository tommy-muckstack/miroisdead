// Client-side image preparation: resize + compress to a data URL small enough to live inside the board document
// (no object storage, no cost). Target ≤ 250 KB per image; PNG keeps transparency, everything else becomes JPEG.
async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number; close?: () => void }> {
  try { return await createImageBitmap(file); } catch { /* fall back to an <img> (some headless/embedded browsers lack createImageBitmap for blobs) */ }
  const url = URL.createObjectURL(file);
  try { return await new Promise<HTMLImageElement>((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error("decode failed")); img.src = url; }); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
export async function prepareImage(file: File | Blob, maxEdge = 1600): Promise<{ src: string; w: number; h: number }> {
  const bitmap = await decode(file);
  let { width: w, height: h } = bitmap; const scale = Math.min(1, maxEdge / Math.max(w, h)); w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const g = canvas.getContext("2d")!; g.drawImage(bitmap, 0, 0, w, h); bitmap.close?.();
  const png = (file as File).type === "image/png" || (file as File).type === "image/gif";
  let q = 0.85, src = canvas.toDataURL(png ? "image/png" : "image/jpeg", q);
  while (src.length > 250_000 && (q > 0.4 || canvas.width > 480)) {
    if (png || q <= 0.4) { canvas.width = Math.round(canvas.width * 0.75); canvas.height = Math.round(canvas.height * 0.75); const b2 = await decode(file); canvas.getContext("2d")!.drawImage(b2, 0, 0, canvas.width, canvas.height); b2.close?.(); w = canvas.width; h = canvas.height; if (!png) q = 0.85; }
    else q -= 0.15;
    src = canvas.toDataURL(png ? "image/png" : "image/jpeg", q);
  }
  return { src, w, h };
}
export const isImageFile = (f: File | DataTransferItem) => /^image\/(png|jpeg|jpg|webp|gif)$/.test(f.type);
