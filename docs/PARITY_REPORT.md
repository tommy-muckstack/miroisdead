# Parity report: MiroIsDead vs miro.com

Last full pass: 2026-10-15. Scope per the owner: the logged-out surface is the home page and sign-in; the logged-in app must replicate Miro's functionality, with every paid feature available for free (nothing gated).

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
| Landing | Mega-menus on Product/Use Cases/Solutions/Resources | missing | S2 | Hover menus not built (logged-out scope is home + login per owner; open question). |
| Pricing | Hero, toggle, 4 cards, Guard, compare matrix, trust, security, FAQ | match | S3 | Prior pass. Known: nav is sticky here but not on miro.com/pricing; Business CTA order (Try for free / or buy now) reversed; "Ccontentful" typo. Out of the owner's logged-out scope; left as-is. |
| Auth | Sign-in card (providers row, SSO, email, Remember me, CTA) | match | — | 44px heading, 18px controls; helper copy kept truthful (password sign-in). PR #2 |
| Auth | Sign-in extras (arrow link, grey "Trouble signing in?" box, fine print) | match | S3 | Arrow link = demo sign-in (when enabled); box requests a password reset; reCAPTCHA line replaced by "New to MiroIsDead?" (exception: no CAPTCHA, no support chat bubble). PR #2 |
| Auth | Sign-up page (board chrome behind the card) | match | S3 | Real header pill, right pill with avatars/Present/Share, AI button and tool rail drawn behind the card. Providers are Google/Microsoft/SSO vs Google/Office365/Slack (exception). PR #2 |
| Auth | Google button | match | — | Official G mark, Google Sans Medium (prior pass). |
| Dashboard | Shell: left rail (workspace, search, Home/Starred/Browse, Spaces, AI promo), top bar, serif greeting, template strip, recents list | match | S3 | Greeting rotates; avatar is round; dates use "Dec 3, 2025" style. PR dashboard |
| Dashboard | Create menu, profile menu, templates modal | match | — | Verified against signed-in capture. |
| Dashboard | Starred / Browse / Spaces | missing | S2 | PR dashboard: star boards, Browse = all boards, Spaces as folders. |
| Dashboard | Board limit banner / Upgrade | n/a | — | Everything is free; Upgrade chrome kept for look only. |
| Board | Top-left pill (sidebar, logo, emoji picker, title, main menu, export, Upgrade pill) | match | — | Emoji is stored on the board; Upgrade is look-only. PR #3 |
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
| Board | Keyboard map (S shapes, L line, C comment, ⌥1/⌥2, G grid, ⌘G group, ⌘⇧L lock, fn↑/↓ order, ⌘K palette) | differs | S1 | PR shortcuts |
| Board | Comments (C tool, pins with count/initials, thread popover with reply/resolve/delete, comments panel Open/Resolved, ⇧C hides, context-menu Add comment) | match | S3 | Comments are excluded from exports like Miro. PR #5 |
| Board | Keyboard: L = connection line, C = comment (Miro's map) | match | — | PR #5 |
| Share | Public viewer (`/b/{id}`): view-only or guest editing, embed mode, start on first frame | match | S3 | Guests see a "View only / Editing as a guest" bar; the rail/AI bar hide in view-only. PR #6 |
| Board | Collaborator cursors, real-time sync, presentation mode, images/upload | missing | S1 | Follow-up PRs (presentation next; multiplayer needs a sync channel). |
| Share | Invite tab (email field, link row with Can edit/view, Copy team invite link, Board access, Anyone with the link) | match | — | "Anyone with the link" really works: No access / Can view / Can edit persisted on the board; public URL `/b/{id}` with a read-only viewer or guest editing. Emails aren't sent (no mail service); the link is copied for you to send. PR #6 |
| Share | Embed tab (private notice, start view Board/First frame, View only, preview, Embed code, Copy code / Copy link) | match | — | iframe embeds the public viewer (`?embed=1`). PR #6 |
| Share | Publish tab (community template / custom template cards) | match | S3 | Custom templates are free (saved locally); community publishing opens a GitHub issue. PR #6 |
| Perf | 500+ objects, input latency, first load | untested | — | To measure. |
| States | 404 / offline / loading / error | partial | S2 | Loading + not-found exist; offline falls back to device storage. |

## Exceptions (documented, justified)
- Trademarks and assets: Miro's logo, customer logos, photos, illustrations and fonts are not copied. Wordmarks are text, art is CSS/SVG, fonts are Albert Sans / Noto Sans (OFL) as stand-ins for Roobert PRO / Noto Sans.
- Marketing claims about integrations (Jira, Linear, Slack…) and AI agents are rephrased to what the clone actually does.
- "Contact sales" → "View source"; "No password required" → password sign-in copy; reCAPTCHA / region sign-in / enterprise SSO are not applicable.
- Paid Miro features are built as free equivalents; Upgrade/Free-plan chrome stays for look only and never gates anything.
