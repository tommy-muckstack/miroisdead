import { describe, expect, it, vi } from "vitest";
import { shareLink } from "@/lib/share";
describe("shareLink", () => {
  const data = { title: "Board", text: "Join me", url: "https://x.test/b/1" };
  it("uses the share sheet when the browser has one", async () => { const share = vi.fn().mockResolvedValue(undefined); expect(await shareLink(data, { share, canShare: () => true })).toBe("shared"); expect(share).toHaveBeenCalledWith(data); });
  it("reports a dismissed sheet without copying", async () => { const writeText = vi.fn(); expect(await shareLink(data, { share: () => Promise.reject(Object.assign(new Error("x"), { name: "AbortError" })), clipboard: { writeText } })).toBe("dismissed"); expect(writeText).not.toHaveBeenCalled(); });
  it("falls back to the clipboard", async () => { const writeText = vi.fn().mockResolvedValue(undefined); expect(await shareLink(data, { clipboard: { writeText } })).toBe("copied"); expect(writeText).toHaveBeenCalledWith(data.url); });
  it("copies when the sheet errors for another reason", async () => { const writeText = vi.fn().mockResolvedValue(undefined); expect(await shareLink(data, { share: () => Promise.reject(new Error("no")), clipboard: { writeText } })).toBe("copied"); });
  it("fails cleanly with neither", async () => { expect(await shareLink(data, {})).toBe("failed"); });
});
