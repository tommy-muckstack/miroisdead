# Parity report: MiroIsDead vs miro.com

Last full pass: 2026-10-15 (PRs #1–#9, stacked in order). Scope per the owner: the logged-out surface is the home page and sign-in; the logged-in app must replicate Miro's functionality, with every paid feature available for free (nothing gated).

## Method
- Original captured with Playwright (`scripts/parity-capture.mjs`, `scripts/parity-segments.mjs`) at 1440×900 and 390×844: full-page shots, viewport segments and a computed-style dump (font, size, weight, colour, radius, shadow, rects) for every heading, paragraph, button, input and link.
- Logged-in Miro surfaces captured in a signed-in Chrome session at 1512×675 (dashboard, Create/profile menus, templates modal, board chrome, tool panels, context toolbar, context menu, share modal tabs, export/zoom/help/facilitation menus, frames panel, sticky colour picker, shortcuts panel).
- Clone captured the same way (`scripts/parity-app.mjs` for the app). Paired shots live in `docs/parity/`; the working set with every segment is kept outside the repo.
- Severity: **S1** a user notices immediately · **S2** noticeable on a second look · **S3** only when measured.

## Status table
| Area | Screen / feature | Status | Severity | Notes / PR |
| --- | --- | --- | --- | --- |
| Landing | Nav (logo, 5 items, Login, ghost + primary CTA) | match | — | Ghost button reads "View source" instead of "Contact sales" (exception: no sales team). |
| Landing | Hero copy, 56px display heading, 20px sub, 360×46 form | match | — | PR landing |
| Landing | Hero canvas art (feedback table, flow doc, BPMN card, cursors, prompt box, connector lines) | match | S3 | Rebuilt as CSS/SVG; placeholder names, no Miro assets. PR landing |
| Landing | Customer logo strip under hero | differs | S3 | Text wordmarks in a white marquee card; Miro shows logo images (exception: no third-party logos). |
| Landing | Use-case tabs (centred pill, 4 tabs, 40px heading, 18px bullets, dark CTA) | match | — | Bullets reworded where Miro's claims (Jira sync, Claude import) don't exist here. PR landing |
| Landing | "Moving the needle" + 3 cards + stats | match | S3 | Cards use gradients instead of customer photos (exception). |
| Landing | Experience carousel (48px heading, Slides pill, 6 slides with art) | match | S3 | Slide art recreated in CSS/SVG. PR landing |
| Landing | "The AI platform for teamwork" section (desktop) | match | — | Was mobile-only; now on desktop too. PR landing |
| Landing | Help cards (6, carousel arrows, 24px titles, tag colours) | match | — | PR landing |
| Landing | Footer (18px headings, 14px links, badges, social, store badges, legal row) | match | — | PR landing |
| Landing | Cookie banner | match | — | Real consent banner (choice stored locally); replaces the old join bar. PR landing |
| Landing | Mobile 390 (burger nav, stacked hero, cookie sheet) | match | S3 | Hero heading wraps on 3 lines like Miro. |
| Landing | Mega-menus on Product / Use Cases / Solutions / Resources (hover panels with column groups) | match | S3 | Column groups mirror miro.com's; links go to the matching section, pricing or sign-up. PR #11 |
| Pricing | Hero, toggle, 4 cards, Guard, compare matrix, trust, security, FAQ | match | S3 | Prior pass; PR #9 fixes the non-sticky nav, Business CTA order (Try for free / or buy now) and a wordmark typo. Out of the owner's logged-out scope otherwise. |
| Auth | Sign-in card (Google + email only, Remember me, CTA) | differs (by design) | — | Owner decision: Microsoft, SSO and the "+" providers are removed; Google and email are the only sign-in methods. PR #15 |
| Auth | Sign-in extras (arrow link, grey "Trouble signing in?" box, fine print) | match | S3 | Arrow link = demo sign-in (when enabled); box requests a password reset; reCAPTCHA line replaced by "New to MiroIsDead?" (exception: no CAPTCHA, no support chat bubble). PR #2 |
| Auth | Sign-up page (board chrome behind the card) | differs (by design) | — | Google + email only; backdrop and rail use the MiroIsDead wordmark. PR #15 |
| Auth | Google button | match | — | Official G mark, Google Sans Medium (prior pass). |
| Dashboard | Shell: left rail (workspace, search, Home/Starred/Browse, Spaces, AI promo), top bar, serif greeting, template strip, recents list | match | — | Rotating greeting (“Let’s build, …” etc.), round blue avatar, workspace named after the user (double-click to rename), search filters boards, “Dec 3, 2025” dates, board emoji in the list, banner/promo dismissal remembered. PR #7 |
| Dashboard | Create menu, profile menu, templates modal, “Templates for …” picker | match | — | Templates modal gains a “Your templates” section fed by Export ▸ Save board as template (free). PR #7 |
| Dashboard | Starred / Browse / Spaces, row ⋯ menu (open in new tab, rename, duplicate, star, move to space, backup, delete) | match | S3 | Stars, spaces and board→space assignments are per-device preferences (localStorage), not synced. PR #7 |
| Dashboard | Board limit banner / Upgrade / Free plan chrome | differs (by design) | — | Removed entirely: everything is free, so there is no Upgrade button or plan badge anywhere in the app, and the notifications banner is gone. PR #15 |
| Board | Top-left pill (sidebar, MiroIsDead wordmark, emoji picker, title, main menu, export) | match | — | "miro" wordmark replaced by the MiroIsDead mark + name everywhere (board, dashboard, sign-up backdrop); Upgrade pill removed. PR #15 |
| Board | Top-right pill (facilitation, activity, call, avatar, present, Share) | match | S3 | Activity and call buttons are stubs (no multiplayer yet). |
| Board | Tool rail (AI, select, formats, templates, sticky, text, shapes, pen, frame, stickers, comment, +) | match | — | Compact rail under 720px like Miro; "+" opens the searchable Tools/Marketplace panel with the pinned tools. PR #3 |
| Board | Shapes & lines flyout | match | — | Prior pass. |
| Board | Main (kebab) menu: Board / Edit / View / Preferences / Accessibility submenus, Assign status, Send to display | match | S3 | PR #3 |
| Board | Lock / unlock objects (toolbar, context menu, lock badge) | match | — | PR #3 |
| Board | Sticky colour picker (16 swatches when sticky tool is active) | match | — | PR #3 |
| Board | Context toolbar (sticky/shape/text/connector) | match | S3 | Prior pass; verified against shape capture. |
| Board | Right-click context menu (object + canvas) | match | S3 | Copy/link/image, duplicate, delete, copy/paste style, clear, Arrange ▸, Link to (stub), Lock, Create frame, Save as template, CSV. PR #3 |
| Board | Export menu (PDF, image, template, CSV, backup, embed, Drive) | match | S3 | PDF via print window, PNG via rasterised SVG, CSV of text objects, backup JSON, custom template (local), Embed opens Share ▸ Embed; Drive = backup download (exception: no Google API). PR #3 |
| Board | Zoom menu (full screen, minimap, grid, object dimensions, fit, presets) | match | — | PR #3 |
| Board | Help menu + Shortcuts panel (blue header, icon column, Tools/General/Navigation/Text) | match | — | PR #3 |
| Board | Facilitation popover (6 reactions, Timer, Voting, Private mode, Note) | match | — | Paid in Miro, free here: floating reactions, countdown timer with chip in the header + chime, dot-voting sessions with per-person budget and results, private-mode stickies (hatched until revealed), shared board note. PR #4 |
| Board | Frames panel (bottom bar) with empty state, list, create, present | match | S3 | PR #3 |
| Board | Keyboard map (S shapes, L line, C comment, ⌥1/⌥2/⌥3, G grid, ⌘G/⌘⇧G group, ⌘⇧L lock, fn↑/↓ order, ⌘K palette, ⌘⇧C copy as image) | match | — | PR #3, #5, #8 |
| Board | Comments (C tool, pins with count/initials, thread popover with reply/resolve/delete, comments panel Open/Resolved, ⇧C hides, context-menu Add comment) | match | S3 | Comments are excluded from exports like Miro. PR #5 |
| Board | Keyboard: L = connection line, C = comment (Miro's map) | match | — | PR #5 |
| Share | Public viewer (`/b/{id}`): view-only or guest editing, embed mode, start on first frame | match | S3 | Guests see a "View only / Editing as a guest" bar; the rail/AI bar hide in view-only. PR #6 |
| Board | Presentation mode (Present button / Frames panel: full screen, frame-by-frame with arrows/space, bottom bar, Esc exits) | match | S3 | PR #8 |
| Board | Grouping (⌘G / ⌘⇧G, toolbar button, click selects the group, click again drills into a member) | match | — | PR #8 |
| Board | ⌘K command palette (create, view, edit, board, facilitation, help commands) | match | S3 | PR #8 |
| Board | Live collaboration: collaborator cursors with name chips, avatar stack, selection highlights, document relay | match | S3 | Zero-cost design: WebRTC data-channel mesh between signed-in collaborators (Firestore carries only a few signalling docs per session), BroadcastChannel for same-browser tabs, plus the WebSocket relay route as a best-effort extra. Nothing persisted; last-writer-wins. Needs the `miroisdead_live` rules from `firestore.rules` on the shared project. PR #10, #14 |
| Board | Rotation handle (bottom-left like Miro, snaps near 45°), rotated selection chrome and hit-testing | match | S3 | Resize handles stay axis-aligned for rotated objects. PR #12 |
| Board | Images: Upload (tools panel), drag-and-drop, paste; compressed client-side and stored inside the board (no file storage) | match | S3 | ≤ ~250 KB per image; boards over ~700 KB warn (Firestore 1 MiB doc cap). PR #12 |
| Board | Stickers, Emoji and GIFs panel | match | S3 | Emoji sets insert as large text objects; GIF/sticker packs need a paid API (exception). PR #12 |
| Board | Docs / Tables / Slides formats | missing | S2 | Separate Miro products; not replicated. |
| Share | Invite tab (email field, link row with Can edit/view, Copy team invite link, Board access, Anyone with the link) | match | — | "Anyone with the link" really works: No access / Can view / Can edit persisted on the board; public URL `/b/{id}` with a read-only viewer or guest editing. Emails aren't sent (no mail service); the link is copied for you to send. PR #6 |
| Share | Embed tab (private notice, start view Board/First frame, View only, preview, Embed code, Copy code / Copy link) | match | — | iframe embeds the public viewer (`?embed=1`). PR #6 |
| Share | Publish tab (community template / custom template cards) | match | S3 | Custom templates are free (saved locally); community publishing opens a GitHub issue. PR #6 |
| Perf | 700 objects (600 stickies/shapes + 100 connectors): first paint 459 ms, idle/pan frame p95 17.5 ms (~57 fps), sticky create→paint 40 ms (`scripts/parity-perf.mjs`, M-series Mac, headless Chromium) | match | — | Measured 2026-10-15 on PR #8. |
| States | 404 page, runtime error boundary with retry, offline banner in the editor (auto-resync when back online), loading + board-not-found | match | S3 | PR #9 |

## Exceptions (documented, justified)
- Trademarks and assets: Miro's logo, customer logos, photos, illustrations and fonts are not copied. Wordmarks are text, art is CSS/SVG, fonts are Albert Sans / Noto Sans (OFL) as stand-ins for Roobert PRO / Noto Sans.
- Marketing claims about integrations (Jira, Linear, Slack…) and AI agents are rephrased to what the clone actually does.
- "Contact sales" → "View source"; "No password required" → password sign-in copy; reCAPTCHA / region sign-in / enterprise SSO are not applicable.
- Paid Miro features are built as free equivalents; Upgrade / Free-plan chrome and the notification banner were removed on the owner's request (2026-10-15), and sign-in is Google + email only.

## QA findings (hands-on pass, 2026-10-15)
41 findings from the external QA pass; each is closed here as fixed (PR) or a justified exception.

| # | Finding | Status | Where |
|---|---|---|---|
| 1 | Board list › Rename does nothing visible | fixed: "Rename board" modal (Board name, Save/Cancel) | PR #19 |
| 2 | Board list › options menu renders under the next row | fixed: the row with an open menu is lifted above its siblings (`.mx-acts` is transformed, so the popup's z-index was trapped) | PR #19 |
| 3 | Board list stale after Duplicate/Delete | fixed: optimistic list update + `cache: "no-store"` on the list fetch | PR #19 |
| 4 | Native `confirm()` on Delete | fixed: styled "Delete board?" modal (no Free-plan/upgrade copy on purpose, see exceptions) | PR #19 |
| 5 | Missing menu items | fixed: Open in new tab, Rename, Duplicate, Board details, Share, Copy board link, Make board private/public, starred, Move to Team/Space, Download board backup, Delete | PR #19 |
| 29 | Templates modal: Escape leaves the scrim | fixed: a capture-phase Escape closes the modal and scrim together; "Blank board" is clickable right after | PR #26 |
| 30 | Templates modal content | fixed: "Templates with AI built in" hero, MiroIsDeadverse nav item, a "Product team templates" section, full-width search, and 6 new real templates drawn from scratch (Kanban, Mind map, SWOT, Goal setting (OKR), User story map, Weekly planner) | PR #26 |
| 31 | + Create menu last item | fixed: "Explore MiroIsDeadverse" with icon, wider menu, no overflow | PR #26 |
| 32 | Dashboard header | partial: the bell is "Feed"; exception for Free-plan pill / Upgrade / "$500" referral (owner: no plan or upgrade chrome, everything is free) | PR #26 |
| 33 | Greeting | fixed: one stable "We've got this, <name>" line, clamped size, never wraps (ellipsis) | PR #26 |
| 34 | Long team names | fixed: one line with ellipsis | PR #26 |
| 35 | Templates strip | fixed: 12 templates + "From MiroIsDeadverse →" link (opens the modal); strip scrolls horizontally | PR #26 |
| 36 | Recents thumbnails | fixed: list view shows a Miro-style board icon; grid view keeps the live thumbnail | PR #26 |
| 37 | Profile menu | exception: no Upgrade item (owner rule); "MiroIsDead Marketplace" is the Miro-equivalent label under the "say MiroIsDead wherever Miro says Miro" rule | — |
| 6 | Hover actions, Today/Yesterday, truncated owner | fixed: Last opened says Today / Yesterday / date; the owner column keeps clear of the hover buttons | PR #19 |

PostHog project 666931 (IsDead family) with the taxonomy in `docs/ANALYTICS.md`; PR #16.

## Open items needing a human decision
1. **Multiplayer**: the Vercel WebSocket relay turned out to put every connection on its own instance (Vercel's docs point to Redis for rooms, which costs), so live sync now runs as a WebRTC mesh with Firestore signalling (PR #14). One-time step: add the `miroisdead_live` block from `firestore.rules` to the shared `yourappisdead` ruleset (the repo file is MiroIsDead-only; deploying it alone would drop the other apps' rules). Guests who aren't signed in get tab-sync only; ~10% of networks without TURN can't connect peer-to-peer.
2. **Mega-menus**: built in PR #11.
3. **Logos, photos and store badges**: text stand-ins instead of third-party marks (trademark). Keep, or commission original illustrations.
4. **Email invites**: no mail service; the Share dialog copies the link instead. Wire a provider only if you accept the cost.
5. **Rotation, images, stickers**: built in PR #12 with images stored inside the board document (no storage bill). Docs/Tables/Slides formats and GIF packs are not replicated; the AI bar stays a bring-your-own-agent flow (copy scene JSON).
6. **Mobile (390) for the logged-in app**: Miro's mobile web is a reduced experience that hands off to its native apps; the clone's phone layout works but was not compared screen-by-screen.
