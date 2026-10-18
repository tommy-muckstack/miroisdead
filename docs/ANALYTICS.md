# Analytics (PostHog)

One PostHog project (US cloud, project **666931**) collects the hub and every IsDead sub-app. The contract is the hub's
`yourappisdead/ANALYTICS.md`; this file is how MiroIsDead follows it.

## Setup
- `NEXT_PUBLIC_POSTHOG_KEY` = the project's publishable token (safe in the browser); `NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com`. No key → analytics is a no-op.
- Reverse proxy through the app's own origin: `/miroisdead/ingest/*` → `us.i.posthog.com` (rewrites in `next.config.mjs`, with `skipTrailingSlashRedirect: true` so `/ingest/e/` is passed through unchanged).
- `<Analytics />` is mounted once in `app/layout.tsx`; it boots the client and sends PostHog's built-in `$pageview` per route change (`capture_pageview` off, autocapture off, session replay off).
- Privacy: `before_send` (`scrub` in `lib/analytics/posthog.tsx`) keeps only origin + path of every URL property (query strings and hashes dropped), masks board ids in `/b/<id>` and `/app/board/<id>` as `:id` (a public board link works like a password) and drops the page `title`. Heatmaps, performance capture and autocapture are off.
- posthog-js drops events from bots and automated browsers, so Playwright never produces captures. In dev, `localStorage.isdead_ph_debug = "1"` turns on verbose logs and lets automated browsers capture; production keeps the bot filter.

## Super properties (registered on every event)
| property | value | meaning |
| --- | --- | --- |
| `product` | `miroisdead` | the one property to filter by (the hub sends `yourappisdead`) |
| `surface` | `landing` \| `app` | `landing` = logged-out marketing pages (home, pricing, sign-in, legal); `app` = the dashboard and editor (`/app/*`) and public board links (`/b/*`) |
| `platform` | `web` | |
| `env` | `production` \| `development` | |
| `account_type` | `firebase` \| `guest` \| `demo` | registered after identification |

Every IsDead app shares the `yourappisdead.com` cookie, so at boot the client unregisters older taxonomies' super
properties (`app`, `app_family`, `base_path`, `suite_id`, `app_id`, `source`, `site_id`, …; MiroIsDead itself used to send
`app`, `app_family` and `base_path`) before registering its own.

## Identity
Signed-in users are identified by their Firebase uid (shared across the family) with `account_type: "firebase"`. Guests
and demo sessions are never identified; `account_type` is registered instead. Sign-out calls `reset()` and re-registers
the super properties.

## Events
`app_<object>_<action>` (or `landing_…` on the marketing site), snake_case, past tense. The product name is never in an event name.

| group | events |
| --- | --- |
| account | `app_auth_started` / `app_auth_failed` (`method`, `mode`: signin \| signup, `reason`: error code only), `app_signed_up` (`method`: password), `app_signed_in` (`method`: password \| google \| demo), `app_signed_out`, `app_onboarding_completed` (`use`, `team_size`, `skipped`) |
| dashboard | `app_board_created` (`template`, `origin`, `in_space`), `app_board_opened` (`origin`), `app_board_renamed` / `_duplicated` / `_deleted`, `app_board_exported` (`origin`: dashboard \| editor, `format`), `app_board_starred` (`starred`), `app_space_created`, `app_templates_modal_opened`, `app_template_filter_changed` (`filter`), `app_shared` (`object`: board \| invite, `method`, `via`, `access`, `result`) |
| board editor | `app_board_object_created` (`object_type`, `count`, `remote`), `app_board_tool_selected` (`tool`), `app_board_template_inserted` (`template`, `objects`), `app_board_share_opened` (`tab`), `app_board_share_access_changed` (`access`), `app_board_comment_posted` (`reply`), `app_board_timer_started` (`minutes`), `app_board_voting_started` (`votes_per_person`) / `_ended` (`votes_cast`), `app_board_reaction_sent` (`emoji`), `app_board_present_started` (`frames`), `app_board_command_run` (`command`), `app_board_group_changed` (`action`, `count`), `app_board_live_peer_connected` (`peers`), `app_board_guest_viewed` (`access`, `embed`) |
| marketing | `landing_cta_clicked` (`target`), `landing_nav_clicked` (`menu`, `item`), `landing_use_case_tab_selected` (`tab`), `landing_cookie_choice_made` (`choice`) |

Renamed from the old MiroIsDead taxonomy (2026-10): `site_page_viewed` / `app_page_viewed` → `$pageview`; `site_*` →
`landing_*` (`cta` → `target`); `auth_completed` → `app_signed_up` / `app_signed_in`; `auth_*` → `app_auth_*`;
`auth_signed_out` → `app_signed_out`; `board_*` → `app_board_*`; `board_link_shared` + `app_invite_shared` → `app_shared`;
`board_exported` merged into `app_board_exported`. Auth `method: "email"` is now `"password"`. The event property `source` is now `origin` (`source` was a legacy super property in the shared project).

Rules:
- Properties are `snake_case`. Never send user content (text, emails, titles, file names) as a property; send kinds, counts and ids only.
- Adding an event = add it to `lib/analytics/taxonomy.ts` (the only place event names are defined) and this table. The unit test rejects names outside `app_` / `landing_` and names containing the product.

## Where the calls live
`lib/analytics/` (client + taxonomy), `components/MiMk.tsx` / `HeroTabs.tsx` / `MegaMenu.tsx` / `MiHome2.tsx` (marketing),
`components/MiAuth.tsx` (sign-in events, sent with `trackNow` before the redirect), `components/BoardsApp.tsx`
(dashboard; identifies the user), `components/board/Editor.tsx` + `ShareModal.tsx` (editor).
