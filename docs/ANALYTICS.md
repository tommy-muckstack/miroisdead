# Analytics (PostHog) — IsDead family taxonomy

One PostHog project (US cloud, project **666931**) collects every IsDead sub-app. This document is the contract each
sub-app follows so one set of insights and dashboards works across all of them.

## Setup per sub-app
- `NEXT_PUBLIC_POSTHOG_KEY` = the project's publishable token (safe in the browser); `NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com`. No key → analytics is a no-op.
- Reverse proxy through the app's own origin: `/<basePath>/ingest/*` → `us.i.posthog.com` (rewrites in `next.config.mjs`, with `skipTrailingSlashRedirect: true` so `/ingest/e/` is passed through unchanged).
- Mount `<Analytics />` once in the root layout; it boots the client and sends one `*_page_viewed` per route change (`capture_pageview` is off, autocapture is off, session replay is off).
- posthog-js drops events from bots and automated browsers (headless / `navigator.webdriver`), so Playwright never produces captures. In dev, `localStorage.mi_ph_debug = "1"` turns on verbose logs and lets automated browsers capture (used by the verification script); production keeps the bot filter.

## Super properties (registered on every event)
| property | values | meaning |
| --- | --- | --- |
| `app` | `miroisdead`, `calendlyisdead`, … | which sub-app |
| `app_family` | `yourappisdead` | the family; lets one dashboard filter all sub-apps |
| `surface` | `hub` \| `site` \| `app` | `hub` = the yourappisdead.com hub (already live), `site` = a sub-app's logged-out marketing pages (home, pricing, sign-in), `app` = the signed-in product |
| `base_path` | `/miroisdead` | the sub-app's mount path |
| `env` | `production` \| `development` | |
| `account_type` | `firebase` \| `demo` | registered after identification |

## Identity
Signed-in users are identified by their Firebase uid (shared across the family) with `account_type: "firebase"`. Demo
sessions are never identified (no person profile); `account_type: "demo"` is registered instead. Sign-out calls `reset()`.

## Event naming
`snake_case`, prefixed by domain. Prefixes are the same in every sub-app:

| prefix | scope | examples |
| --- | --- | --- |
| `site_` | marketing website | `site_page_viewed`, `site_cta_clicked` (`cta`), `site_nav_clicked` (`menu`, `item`), `site_use_case_tab_selected`, `site_cookie_choice` |
| `auth_` | sign in / sign up | `auth_started`, `auth_completed`, `auth_failed`, `auth_verification_shown`, `auth_verification_result`, `auth_onboarding_completed` (`method`: email \| google \| demo, `mode`: signin \| signup, `reason`: error code only), `auth_signed_out` |
| `app_` | workspace / dashboard | `app_page_viewed`, `app_board_created` (`template`, `source`), `app_board_opened` (`source`), `app_board_renamed` / `_duplicated` / `_deleted` / `_exported` / `_starred`, `app_space_created`, `app_templates_modal_opened` |
| `board_` | MiroIsDead's product noun (other sub-apps use theirs: `form_`, `event_`, `design_`, …) | `board_object_created` (`object_type`, `count`), `board_tool_selected` (`tool`), `board_exported` (`format`), `board_share_opened`, `board_share_access_changed` (`access`), `board_comment_posted`, `board_timer_started`, `board_voting_started` / `_ended`, `board_reaction_sent`, `board_present_started`, `board_command_run` (`command`), `board_group_changed`, `board_live_peer_connected` (`peers`), `board_guest_viewed` |

Rules:
- Properties are `snake_case`. Never send user content (text, emails, titles, file names) as a property; send kinds, counts and ids only.
- Adding an event = add it to `lib/analytics/taxonomy.ts` (the only place event names are defined) and this table. The unit test rejects names outside the prefixes.
- Page views: `site_page_viewed` on the marketing surface, `app_page_viewed` inside the product, both with `path` and `$current_url` (so Web Analytics still works).

## Where the calls live (MiroIsDead)
`lib/analytics/` (client + taxonomy), `components/MiMk.tsx` / `HeroTabs.tsx` / `MegaMenu.tsx` / `MiHome2.tsx` (site), `components/MiAuth.tsx` (auth), `components/BoardsApp.tsx` (dashboard), `components/board/Editor.tsx` (board).
