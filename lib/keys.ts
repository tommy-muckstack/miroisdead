import { useEffect, useState } from "react";
// Platform-aware shortcut labels: Mac glyphs on macOS, "Ctrl + " / "Alt + " / "Shift + " words elsewhere (Miro does the same).
export const isMac = (): boolean => { if (typeof navigator === "undefined") return true; const ua = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? ""; return /mac|iphone|ipad|ipod/i.test(ua); };
/** Rewrites a Mac-glyph label for the current platform; the glyphs are the source of truth in code. */
export function kbd(label: string, mac: boolean = isMac()): string {
  if (mac) return label;
  return label
    .replace(/⌘\s*\+\s*/g, "Ctrl + ").replace(/⌥\s*\+\s*/g, "Alt + ").replace(/⇧\s*\+\s*/g, "Shift + ")
    .replace(/⌘\s*–\s*/g, "Ctrl + ") // "⌘ – –" (zoom out)
    .replace(/fn \+ ↑/g, "Page Up").replace(/fn \+ ↓/g, "Page Down")
    .replace(/⌘/g, "Ctrl+").replace(/⌥/g, "Alt+").replace(/⇧/g, "Shift+")
    .replace(/\+\+ /g, "+ ").replace(/Ctrl\+ \+/g, "Ctrl + +");
}
/** React hook: false until mounted on a non-Mac, so server and client markup agree on the first paint. */
export function useMac(): boolean { const [m, setM] = useState(true); useEffect(() => { setM(isMac()); }, []); return m; }
