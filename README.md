# MiroIsDead

A free, open-source, Miro-style online whiteboard. One of the [IsDead apps](https://yourappisdead.com): the marketing page lives at `/miroisdead`, sign-in at `/miroisdead/login`, the app at `/miroisdead/app`. Local-only repo for now.

## What's in the app
- Infinite pan/zoom canvas (scroll = pan, ⌘/Ctrl-scroll or pinch = zoom to cursor, Space-drag or H = hand, 10–600%, ⇧1 fit all, ⇧2 fit selection), dotted grid, minimap (M)
- Stickies (shrink-to-fit text, 8 colours), shapes (rectangle, rounded, ellipse, diamond, triangle), text, freehand pen, frames (contents move with the frame), eraser
- Connectors: rounded elbow, straight and curved; bound to shapes, rerouted live, labels and arrowheads
- Quick-create dots on a selected sticky/shape, Tab / ⇧Tab to chain connected stickies, smart guides, marquee + shift multi-select
- Contextual floating toolbar, align / distribute / frame-selection for multi-select
- Undo/redo with gesture checkpoints, duplicate, copy/paste, layers (bring to front / send to back)
- Boards list with live thumbnails, rename / duplicate / delete, 5 starter templates, JSON import, SVG + JSON export
- Autosave (debounced) to Firestore through the server API, with a localStorage mirror as the offline fallback; the demo account stays on localStorage
- Press `?` in a board for every shortcut

## Run
```
npm install
npm run dev          # http://localhost:3000/miroisdead
npm test             # unit tests (vitest)
npm run typecheck
npm run e2e          # Playwright; starts its own dev server on :3111
```
Without Firebase env (`.env.example`) the login page shows only the demo account. The demo account is on automatically outside production; set `DEMO_MODE=1` to allow it in production.

## Architecture
- Next.js 15 App Router, React 19, TypeScript strict, `basePath: /miroisdead` (use `BP` from `lib/basepath.ts` for plain `fetch`/`<img>`/`<a>`).
- Design: shared `@isdead/design` (vendored in `vendor/isdead-design`) with the new **miro** theme (`data-ids-theme="miro"`). Fonts: Albert Sans (display, OFL) and Noto Sans (body, OFL), both bundled. They are lookalike stand-ins; no Miro assets or licensed fonts are used.
- Auth: shared Firebase project (`yourappisdead`): email/password + Google on the client, `/api/session` exchanges the ID token for the shared `isdead_session` cookie. One demo account through a signed `isdead_demo` cookie.
- Canvas engine (`lib/canvas`): immutable `Doc` model, snapshot history, orthogonal connector routing, hit testing, snapping. `components/board/Scene.tsx` is the single renderer for the editor, board thumbnails and SVG export.
- Storage: `lib/server/repo.ts` (Firestore `users/{uid}/miroisdead_boards/{id}` with a JSON `payload`, memory fallback). `firestore.rules` locks direct client access to the owner.

## Reused from the Brainz canvas work
Research in `/workspace/whiteboard-research` (Brainz canvas spec, Miro UX notes) was reused rather than redone: the single-key tool map, quick-create dots and Tab chains, shrink-to-fit sticky text, contextual toolbar, filter/align/distribute, frames and minimap came from the Miro notes; the board envelope, debounced autosave (180–600 ms) and the plain-JSON scene description for agents came from the Brainz spec. The engine itself is a fresh React/SVG implementation (Brainz's BlockSuite was not reused, for testability and stack parity).

## Not built yet
Real-time multiplayer and cursors, images/file uploads, rotation, Docs/Tables/Slides formats, stickers, Mermaid import, mobile touch gestures beyond pinch/pan. Parity status per screen: `docs/PARITY_REPORT.md`.

## License
Apache-2.0. Not affiliated with, endorsed by or sponsored by RealtimeBoard, Inc. (Miro).

## Open source & contributing

This project is part of **[yourappisdead](https://yourappisdead.com)**, a marketplace of free, open-source clones of paid SaaS apps. It is an independent clone built from public product behavior; it is not affiliated with, endorsed by, or using any code or assets from the original product. All brand names belong to their owners.

- Licensed under Apache-2.0 (see `LICENSE`).
- Contributions are welcome: read the [contributing guide](https://github.com/tommy-muckstack/yourappisdead/blob/main/CONTRIBUTING.md) and the [code of conduct](https://github.com/tommy-muckstack/yourappisdead/blob/main/CODE_OF_CONDUCT.md), then open an issue or pull request.
- Want a different app killed? [Submit it on yourappisdead](https://yourappisdead.com/#submit).
- Please never commit secrets, keys or copied third-party assets (logos, screenshots, fonts without an open license).
- Shared design tokens, fonts and login live in [`isdead-design`](https://github.com/tommy-muckstack/isdead-design).
