import { describe, it, expect } from "vitest";
import { EVENTS, EVENT_PREFIXES, APP, superProps } from "@/lib/analytics/taxonomy";
describe("analytics taxonomy", () => {
  it("uses the shared prefixes and snake_case", () => { for (const e of Object.values(EVENTS)) { expect(e, e).toMatch(/^[a-z]+(_[a-z]+)+$/); expect(EVENT_PREFIXES.some(p => e.startsWith(p)), e).toBe(true); } });
  it("never puts the product name in an event name", () => { for (const e of Object.values(EVENTS)) expect(e.includes(APP.replace(/isdead$/, ""))).toBe(false); });
  it("sends the hub's super properties", () => { expect(superProps("app")).toEqual({ product: APP, surface: "app", platform: "web" }); });
});
describe("analytics taxonomy keys", () => {
  it("keys every event by its own name", () => { for (const [k, v] of Object.entries(EVENTS)) expect(k).toBe(v); });
});
import { scrub } from "@/lib/analytics/posthog";
describe("analytics privacy", () => {
  it("strips query strings, hashes and titles", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/x/app?url=https://secret.example#frag", $referrer: "https://google.com/search?q=me", title: "My private doc" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/x/app"); expect(e.properties.$referrer).toBe("https://google.com/search"); expect("title" in e.properties).toBe(false);
  });
});
describe("analytics privacy (nested person properties)", () => {
  it("scrubs every url/referrer/pathname key, including session-entry and $set_once bags", () => {
    const e = scrub({ event: "$pageview", $set_once: { $initial_referrer: "https://x.example/?q=1" }, properties: { $session_entry_url: "https://yourappisdead.com/x/?ref=me#y", $session_entry_pathname: "/x/", $set: { $current_url: "https://yourappisdead.com/x/app?a=1" }, $set_once: { $initial_current_url: "https://yourappisdead.com/x/?utm_source=secret#frag" } } });
    expect(e.properties.$session_entry_url).toBe("https://yourappisdead.com/x/");
    expect(e.properties.$set_once.$initial_current_url).toBe("https://yourappisdead.com/x/");
    expect(e.properties.$set.$current_url).toBe("https://yourappisdead.com/x/app");
    expect(e.$set_once.$initial_referrer).toBe("https://x.example/");
  });
});
