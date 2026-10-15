import { describe, it, expect } from "vitest";
import { MIRO, miroYearly, FEATURES } from "@/lib/pricing";
describe("price comparison", () => {
  it("multiplies seats by yearly-billed per-member price", () => { expect(miroYearly(10, "starter")).toBe(960); expect(miroYearly(10, "business")).toBe(2400); expect(miroYearly(0, "starter")).toBe(0); expect(miroYearly(-3, "business")).toBe(0); expect(miroYearly(2.9, "starter")).toBe(192); });
  it("records the as-of date and a non-empty feature table", () => { expect(MIRO.asOf).toMatch(/2026/); expect(FEATURES.length).toBeGreaterThan(5); });
});
