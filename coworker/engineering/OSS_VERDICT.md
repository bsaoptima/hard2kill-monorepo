# OSS Verdict — GeoHub vs Geoguess-Lite for Geohustler

Date: 2026-04-27
Decision: which OSS GeoGuessr clone to fork as Geohustler's base.

---

## TL;DR Recommendation

**Fork geoguess-lite, but rip everything that isn't `useMultiplayerRoom` + the lobby UI + the score/distance utils + the per-feature server architecture pattern.** Multiplayer is the single hardest, riskiest, and most time-expensive thing to build for a 1v1 wager platform, and geoguess-lite has a real, working, N-player multiplayer loop with disconnect detection and round-state gating — geohub has literally nothing in that lane. The geohub teardown estimated 100% of the multiplayer plumbing as greenfield; geoguess-lite gives us 50-60% of that plumbing as a reference architecture (lobby, presence, round-end gating, disconnect handling). Even after the inevitable port from Vue → React and Mapillary → Google, you save roughly **2 weeks** of engineering vs starting from geohub. The price is a Vue codebase you'll need to translate or re-author in Next.js/React, and committing to a stack rewrite on the server (Python Lambdas + Firebase RTDB → TypeScript Next API + Supabase) — but that rewrite happens to either codebase since neither has Supabase or Stripe wired in.

---

## Side-by-side Table

| Dimension | GeoHub | Geoguess-Lite |
|---|---|---|
| Frontend framework | Next.js 12 (Pages Router) + React 17 | Vue 3.5 + Vite 7 |
| Backend framework | Next.js API routes | Python Lambdas (AWS SAM) + Firebase Functions (Python) |
| Language(s) | TypeScript | TypeScript (client) + Python (server + functions) |
| Total source files (rough) | ~250 (incl. types, components, pages, utils) | ~150 (excl. generated OpenAPI client and shadcn UI primitives); ~270 incl. all generated |
| Top-level deps count (client) | 30+ runtime; many can be ripped (deck.gl, allotment, turf, redux-persist, sendgrid) | 17 runtime; minimal bloat |
| Has multiplayer? | **No** — only async "challenge" links (share-a-URL, no presence, no sync) | **Yes** — N-player rooms, real lobby, presence, server-arbitrated round transitions |
| Has realtime infra? | **None** (no sockets, no pusher, no supabase realtime, no SSE) | **Yes** — Firebase Realtime Database + Firebase Functions for round-end logic |
| Server-private locations? | **No** — `getGame` returns all 5 lat/lngs in the response | **Partial** — server only sends `imageId`, but Mapillary returns lat/lng on pano load. Same outcome, different mechanism. |
| Scoring server-validated? | **Yes** — distance + score computed in `updateGame.ts` on the server | **No** — both computed client-side and written to a writable RTDB path |
| Server-authoritative round timer? | **No** — client `Date.now() - reduxStartTime` | **No** — client `performance.now()` |
| Auth system | NextAuth Credentials + bcrypt + Cryptr-encrypted user-supplied API keys + SendGrid for password reset | Firebase Auth (Google sign-in) + Lambda Authorizer that verifies Firebase ID tokens |
| Database | MongoDB (single) | Postgres (Neon) + Firebase Realtime Database |
| Stripe / wallet / wager | None | None |
| Bonus balance / WR | None | None |
| Deploy story | Single Next.js app | Three-cloud: AWS (Lambdas) + Firebase (auth/RTDB/Functions) + Neon (Postgres) — must consolidate |
| Streetview provider | Google Maps JS (Street View Panorama) | **Mapillary** (cheaper, much worse coverage) |
| Minimap provider | Google Maps JS (`google-map-react`) | Mapbox GL |
| Estimated files to RIP | ~60% of files (map maker, streaks, daily challenge, async challenges, profile/social, leaderboards, admin, NextAuth) | ~50% of files (daily challenge, single-player, profile UI, all server Python rewritten in TS, generated OpenAPI client, Mapillary integration) |
| Files needing FULL REWRITE | ~10% (game flow for 1v1, score/wallet hooks, pages/api/match/*) | ~30% (server entirely rewritten in TS; StreetView component swapped to Google) |
| Files KEEPABLE almost as-is | ~30% (utils, score/distance formulas, system components, modals primitive, Marker component) | ~20% (utils, score/distance formulas, shadcn UI primitives, lobby UI, MultiplayerGamePage architecture, useTimer/useMultiplayerRoom architecture) |
| Estimated weeks to MVP from this base | **6-8 weeks** (build all multiplayer + Supabase swap + Stripe + bonus + curate map + harden) | **4-5 weeks** (port to TS/React-or-Vue + Supabase swap + Stripe + bonus + harden multiplayer for wager + curate map) |

---

## Where Geoguess-Lite Wins

1. **It actually has multiplayer.** Lobby UI, room state, presence, `onDisconnect` handler, server-side round-end gating via Firebase Functions. This is the single biggest reason to pick it. Geohub has zero of this — it's all greenfield there.
2. **Image-pool model is shaped right.** Server's `images` table stores only `image_id`, lets the imagery provider host the rest. We'd extend it with our own coords (so we can validate scores server-side without a round-trip to Google), but the table-shape and `ORDER BY RANDOM() LIMIT 5` sampling pattern are exactly what we need.
3. **Per-feature server architecture (handler / service / repository / model)** is clean and translates well to a Next.js API directory layout. Geohub mixes routes, queries, validations, and utils in less consistent shapes.
4. **Modern stack.** Vue 3 / Vite 7 / TypeScript 5.9 / Python 3.13 / Tailwind 4 / TanStack Query — all current as of Jan 2026. Geohub is on Next 12 / React 17 / Node 14 in Dockerfile — a real upgrade penalty either way.
5. **shadcn-style UI primitives in `components/ui/`** are the modern accepted standard. Geohub's hand-rolled `components/system/*` is fine but bespoke.
6. **Auth is OAuth (Google) by default**, not credentials. Closer to what we want (OAuth + Discord). Geohub is bcrypt+credentials with a SendGrid forgot-password flow that we'd entirely rip.
7. **`useTimer`, `onDisconnect` patterns**, `RoundStateNode` with `hasEveryoneLoaded` / `hasEveryoneGuessed` — these are real architectural ideas we'd otherwise have to invent.
8. **No Redux / no `redux-persist` time bombs.** Geohub's `redux-persist` whitelists `game` state, which would rehydrate a stale `startTime` on reload mid-match. Geoguess-lite's Pinia store has only lobby config; nothing dangerous to persist.
9. **Cleaner Mapbox-style minimap.** Mapbox's `flyTo` animation in `MapComponent.vue:120-125` is sharper UX than the static `google-map-react` minimap.

---

## Where GeoHub Wins

1. **Server-validated scoring.** Geohub's `updateGame.ts` does Haversine + score formula on the server. Geoguess-lite computes both client-side and writes to a public RTDB path. This is a *bigger* deal than it sounds, except that we're rewriting all server logic against Supabase anyway, so this advantage evaporates in practice.
2. **Single-language codebase (all TS).** Geoguess-lite has Python Lambdas + Python Firebase Functions + TS client. We'd need TS+Python skills to develop in parallel, or a full rewrite of the server. Geohub is one-language Next.js.
3. **React, not Vue.** Aligns with hard2kill if hard2kill is React. (User: confirm — the brief says "Next.js or whatever the OSS uses" so this is recoverable.)
4. **Google Street View, not Mapillary.** Geohub already wires up `google.maps.StreetViewPanorama`. Coverage is the right one. Geoguess-lite is built around Mapillary as a first-class assumption — the entire `StreetViewComponent.vue` would be ripped and rewritten for Google.
5. **Single deploy target.** Geohub deploys as a single Next.js app. Geoguess-lite spans three clouds (AWS + Firebase + Neon). We'd consolidate to Vercel + Supabase regardless, but starting from one app is simpler than starting from three.
6. **More UI surface area.** Geohub has a fuller component library (modals, dropdowns, layout primitives). Most we'd cut, but for the parts we keep, geohub gives us a working result-card UX, polylines on the result map, etc.
7. **`adjustedLocation` server-trust hole is the *only* big trust bug.** Once removed, the server-trust posture of geohub is much better than geoguess-lite's (where the entire score is client-trusted).
8. **No daily-challenge dependency woven into user fetches.** Geohub's user model is independent. Geoguess-lite's `users` service calls `has_user_played_today` on every user fetch — minor but a thread to pull.

---

## Hybrid Option

**Don't.** Hybrid is more work than picking one, and here's why specifically:

- The frameworks don't compose. You can't "take geohub's React Street View component and drop it into geoguess-lite's Vue app." You'd be reimplementing it anyway.
- The auth systems don't compose. You can't bolt geohub's NextAuth onto geoguess-lite's Lambda Authorizer.
- The data models are different. Geohub's `Game` model is a per-user single-player thing; geoguess-lite's `RoomNode` is shared multi-user. Trying to make both work means writing a third schema.

The only legitimate hybrid move is **patterns**, not code: read both repos as references, write Geohustler from scratch in Next.js + Supabase, and copy:
- Server-side score/distance formulas from geohub (`backend/utils/calculate{Distance,RoundScore}.ts`).
- Multiplayer room architecture, `onDisconnect` patterns, round-state gating from geoguess-lite (`useMultiplayerRoom.ts` + `functions/main.py`).
- shadcn-style UI primitives and lobby UX from geoguess-lite.
- Pano + minimap component shape from geohub (Google Street View).

This is "patterns hybrid," not "code hybrid." It's the right play but it's basically what you do if you fork geoguess-lite and rip aggressively, since the cheap-to-port pieces of geohub are 200-line pure functions you can recreate in an hour.

**My recommendation is fork geoguess-lite, port the multiplayer composable shape verbatim, and copy in geohub's Google Street View handling and server-side scoring. That's effectively a hybrid weighted ~70/30 toward geoguess-lite.**

---

## Final Call

**Fork geoguess-lite. Strip Mapillary. Strip Firebase Auth. Strip the AWS Lambda backend (rewrite as Next.js API routes). Strip the daily-challenge vertical. Strip single-player. Keep `useMultiplayerRoom`'s shape, `LobbyComponent`'s UI, the score/distance utils, the shadcn UI primitives, and the per-feature server architecture pattern.**

The decision pivots on one number: **how many weeks to MVP**. Geohub's "no realtime infra at all" is a 2-3-week tax for a solo founder. Geoguess-lite's "we have a working multiplayer reference implementation" is the difference between learning Firebase RTDB / Supabase Realtime patterns from a textbook and learning them from a working app you're already running locally.

**Strongest counter-argument** (and it's not weak): *"Going Vue means you fight one extra translation when porting components, every time. The game UI has ~5 core components (StreetView, GuessMap, ResultMap, GameStatus, ResultCard). Building those from scratch in React/Next is 3-4 days. Forking geohub gives you those for free in your target framework. The multiplayer that geoguess-lite has is going to get rewritten anyway because you can't trust client-written scores in RTDB."*

The counter-argument has merit. The reason it doesn't win:

1. **The 3-4 days for component rebuild is symmetric** — you'd rebuild StreetView in geoguess-lite-as-base anyway (Mapillary → Google).
2. **The "you'll rewrite the multiplayer anyway" point understates the value of a *working reference implementation*.** Reading code that runs is 5x faster than designing patterns from a blank file. Even if you don't ship a single line of `useMultiplayerRoom.ts`, having it open in a tab while you write your Next.js + Supabase Realtime version is worth a week.
3. **The Vue→React pain is a one-shot cost.** The geohub-has-no-multiplayer pain is a *novel-design* cost that compounds as you discover edge cases the OSS reference would have flagged for you.
4. **Coding by translation is faster and lower-risk than coding by design.** You'll make fewer architectural mistakes with geoguess-lite as a model than you will inventing the lobby/room/round-end pattern from a blank `pages/match/[id].tsx`.

If you commit to React/Next from day one (which I'd advise), then **what you're really forking is geoguess-lite the design**, and the actual codebase you ship is mostly authored fresh in your target stack — which is fine, the reference value remains.

**Risk of going with this choice:** the Vue codebase tempts you to "just port piece by piece" instead of doing the harder, cleaner thing of writing Next.js + Supabase fresh while reading geoguess-lite as a reference. If you start translating Vue components to React one by one, you'll inherit Vue idioms, generate Frankenstein code, and end up with something neither idiomatic nor fast. **The discipline is: read geoguess-lite for ideas, write Geohustler for shipment.** Set a 3-day timebox on the lobby + multiplayer-room ports. If you're translating instead of authoring at the end of day 3, throw it out and start in a blank Next 14 + App Router project, with `useMultiplayerRoom.ts` still open in the next monitor.
