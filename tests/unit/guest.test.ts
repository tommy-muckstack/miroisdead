import { describe, it, expect } from "vitest";
import { signGuest, verifyGuest, newGuestId, guestEnabled } from "@/lib/isdead-auth/server";

describe("guest sessions", () => {
  it("round-trips a signed guest id", () => {
    const id = newGuestId();
    expect(id).toMatch(/^g_[A-Za-z0-9_-]{20}$/);
    expect(verifyGuest(signGuest(id))).toBe(id);
  });
  it("rejects tampered or foreign values", () => {
    const v = signGuest(newGuestId());
    expect(verifyGuest(v.slice(0, -1) + (v.endsWith("a") ? "b" : "a"))).toBeNull();
    expect(verifyGuest("g_short.sig")).toBeNull();
    expect(verifyGuest("demo." + v.split(".")[1])).toBeNull();
    expect(verifyGuest(undefined)).toBeNull();
  });
  it("is enabled outside production without AUTH_SECRET", () => { expect(guestEnabled()).toBe(true); });
});
