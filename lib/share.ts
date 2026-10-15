// One way to hand a link to another person: the OS share sheet (Web Share API) where the browser has one,
// otherwise the clipboard. No mail service is involved, so inviting stays free.
export type ShareResult = "shared" | "copied" | "dismissed" | "failed";
export type ShareNav = { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>; canShare?: (d: { url?: string; text?: string }) => boolean; clipboard?: { writeText: (s: string) => Promise<void> } };
export async function shareLink(data: { title: string; text?: string; url: string }, nav: ShareNav = (typeof navigator === "undefined" ? {} : navigator) as ShareNav): Promise<ShareResult> {
  if (typeof nav.share === "function" && (nav.canShare ? nav.canShare({ url: data.url, text: data.text }) : true)) {
    try { await nav.share(data); return "shared"; } catch (e) { if ((e as { name?: string })?.name === "AbortError") return "dismissed"; /* fall through to the clipboard */ }
  }
  try { await nav.clipboard?.writeText(data.url); return nav.clipboard ? "copied" : "failed"; } catch { return "failed"; }
}
export const canUseShareSheet = (nav: ShareNav = (typeof navigator === "undefined" ? {} : navigator) as ShareNav) => typeof nav.share === "function";
