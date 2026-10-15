"use client";
// PostHog client for the IsDead family. Requests go through our own origin (/ingest → PostHog) so ad blockers don't
// drop them; the key is the project's publishable token. Without NEXT_PUBLIC_POSTHOG_KEY everything is a no-op.
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { APP, APP_FAMILY, EVENTS, type EventName, type Surface } from "./taxonomy";
import { BP } from "@/lib/basepath";
type PH = typeof import("posthog-js").default;
let ph: PH | null = null; let loading: Promise<PH | null> | null = null;
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";
export const analyticsEnabled = !!KEY;
const surfaceOf = (path: string): Surface => (path.startsWith(`${BP}/app`) || path.startsWith(`${BP}/b/`) ? "app" : "site");

async function client(): Promise<PH | null> {
  if (!KEY || typeof window === "undefined") return null;
  if (ph) return ph;
  loading ??= import("posthog-js").then(m => {
    const p = m.default;
    const debug = process.env.NODE_ENV !== "production" && typeof localStorage !== "undefined" && localStorage.getItem("mi_ph_debug") === "1"; // dev only: verbose logs + accept automated browsers (posthog-js drops bot/webdriver traffic by default)
    p.init(KEY, {
      api_host: `${location.origin}${BP}/ingest`, ui_host: UI_HOST,
      capture_pageview: false, capture_pageleave: true, autocapture: false, disable_session_recording: true,
      persistence: "localStorage+cookie", person_profiles: "always", debug, opt_out_useragent_filter: debug,
    });
    p.register({ app: APP, app_family: APP_FAMILY, base_path: BP, env: process.env.NODE_ENV === "production" ? "production" : "development",
      // Shared-project taxonomy (yourappisdead/ANALYTICS.md): product/surface/platform are persisted super properties, so set them
      // here or the hub's values (product=yourappisdead) leak onto this app's events via the shared cookie.
      product: APP, surface: surfaceOf(location.pathname) === "app" ? "app" : "landing", platform: "web" });
    ph = p; if (process.env.NODE_ENV !== "production") (window as unknown as { __posthog?: PH }).__posthog = p;
    return p;
  }).catch(err => { if (process.env.NODE_ENV !== "production") console.warn("[analytics] PostHog failed to start", err); return null; });
  return loading;
}
/** Fire a taxonomy event. Safe to call anywhere on the client; drops silently when analytics is off. */
export function track(event: EventName, props: Record<string, string | number | boolean | null | undefined> = {}) {
  void client().then(p => p?.capture(event, { surface: surfaceOf(location.pathname), ...props }));
}
export function identify(uid: string, props: { account_type: "firebase" | "demo" | "guest"; app?: string }) {
  void client().then(p => { if (!p) return; if (props.account_type === "firebase") p.identify(uid, { account_type: props.account_type }); else p.register({ account_type: props.account_type }); });
}
export function resetIdentity() { void client().then(p => p?.reset()); }
/** Mount once in the root layout: boots the client and sends a page view per route change. */
export function Analytics() {
  const path = usePathname();
  useEffect(() => { if (!path) return; const full = `${BP}${path}`.replace(/\/{2,}/g, "/"); const s = surfaceOf(full); track(s === "app" ? EVENTS.app_page_viewed : EVENTS.site_page_viewed, { path: full, $current_url: location.href }); }, [path]);
  return null;
}
