import { describe, expect, it } from "vitest";
import { kbd } from "@/lib/keys";
describe("platform shortcut labels", () => {
  it("keeps Mac glyphs on macOS", () => { expect(kbd("⌘ + Z", true)).toBe("⌘ + Z"); expect(kbd("⇧1 fit all", true)).toBe("⇧1 fit all"); });
  it("spells modifiers out elsewhere", () => {
    expect(kbd("⌘ + Z", false)).toBe("Ctrl + Z"); expect(kbd("⌘ + shift + Z", false)).toBe("Ctrl + shift + Z"); expect(kbd("⌥ + drag", false)).toBe("Alt + drag");
    expect(kbd("⌘Z undo · ⌘D duplicate", false)).toBe("Ctrl+Z undo · Ctrl+D duplicate"); expect(kbd("⇧⌘Z", false)).toBe("Shift+Ctrl+Z");
    expect(kbd("fn + ↑", false)).toBe("Page Up"); expect(kbd("Scroll to pan · ⌘ + scroll to zoom", false)).toBe("Scroll to pan · Ctrl + scroll to zoom");
    expect(kbd("⌘ – –", false)).toBe("Ctrl + –"); expect(kbd("⌘ + +", false)).toBe("Ctrl + +");
  });
});
