# GeoHub Teardown — Reference for Geohustler

Date: 2026-04-27
Source: `/Users/stefan/Desktop/Code/game/geohub` (read-only study)
Target: `/Users/stefan/Desktop/Code/game/geohustler` (does NOT exist yet)
Scope: Strip the GeoHub clone down to a 1v1 wagering platform, MVP-grade, single-game loop only. Replace MongoDB+NextAuth-Credentials with Supabase auth + Postgres. Add Stripe and bonus-balance later (out of geohub teardown scope, port from hard2kill).

The codebase is a single-player + async-challenge GeoGuessr clone with **no real-time multiplayer**. Streetview rendering, distance scoring, and the core minimap UX are reusable. Everything around lobby, matchmaking, opponent presence, wager pot and payout is greenfield.

---

## 1. Tech Inventory

| Item | Version | Notes |
|---|---|---|
| Next.js | `12.2.4` | **Old.** Pages router. App Router does not exist here. |
| React | `^17.0.2` | Old; React 18 features not available. |
| TypeScript | `4.4.3` | OK. |
| Node (Dockerfile) | `node:14` | Outdated; for Geohustler use Node 20+. |
| Language | TypeScript | `tsconfig.json` with path aliases `@types/*`, `@components/*`, `@utils/*`, `@redux/*`, `@styles/*`, `@backend/*`, `@pages/*`. |

### Build / dev / test commands (from `package.json`)
- `yarn dev` → `next dev`
- `yarn build` → `next build`
- `yarn start` → `next start`
- `yarn lint` → `next lint`
- `yarn test` → `jest` (note: test files are essentially stubs)

### Dependencies (with one-line purpose)

| Package | Purpose for Geohustler |
|---|---|
| `@deck.gl/core`, `@deck.gl/google-maps`, `@deck.gl/layers` | Marker layers in the **map editor only** (`SelectionMap.tsx`). Cut for MVP. |
| `@heroicons/react@1` | Icon set used everywhere. Keep. |
| `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select` | UI primitives used in dropdowns / selects. Keep if we keep system components. |
| `@reduxjs/toolkit` | Redux store for `user` + `game` slices. Replace or trim — Geohustler should use a smaller store + Supabase session, not redux-persist for game state. |
| `@sendgrid/mail` | Forgot-password emails. Cut for MVP (Supabase handles auth emails). |
| `@turf/boolean-point-in-polygon`, `@turf/turf` | Country polygon hit-testing for **streak mode**. Cut for MVP. |
| `@types/google.maps` | Type defs. Keep. |
| `@vercel/analytics` | Drop or replace with our own analytics. |
| `allotment` | Resizable split panes — used in **map editor**. Cut. |
| `bcryptjs` | Local password hashing for credentials auth. Cut — Supabase handles. |
| `body-scroll-lock` | Mobile modal helper. Keep if used by core modals. |
| `cryptr` | Encrypts user-supplied Google Maps API keys at rest. Cut — Geohustler ships only the platform key. |
| `dotenv` | Env loader. Keep. |
| `file-saver` | Map editor location export. Cut. |
| `google-map-react` | Lightweight wrapper to render the **guess minimap** and the **result map**. **Keep** — this is core. |
| `lodash.debounce`, `lodash.throttle` | Search/scroll throttle. Keep where applicable. |
| `mongodb` | Native Mongo driver. **Rip and replace with `@supabase/supabase-js`.** |
| `next` | Framework. Upgrade. |
| `next-auth` | Auth provider. **Rip — replace with Supabase Auth.** |
| `react`, `react-dom` | React 17. Upgrade to 18. |
| `react-hot-toast` | Toast lib. Keep. |
| `react-infinite-scroll-component` | Used only on listing pages (`/ongoing`, `/maps`). Cut for MVP. |
| `react-linkify` | Auto-link in map descriptions. Cut. |
| `react-redux`, `redux-persist` | Redux + persisted state. Trim heavily; persist nothing critical to game outcome. |
| `styled-components@5` | Styling. Keep (used pervasively) or migrate later. |
| `zod` | Used by `backend/validations/userValidations.ts`. Keep — useful for API input validation. |

### DevDependencies — testing/linting only; mostly irrelevant. Tests are placeholder files.

### Out-of-band runtime dep (NOT in package.json)
- `Map.tsx` calls `getStreaksGuessMap` — uses Turf for country shape geometry; uses `countries.ts` static data. None of this is needed for standard mode.

---

## 2. Run Requirements

### Required env vars (from `process.env.*` grep)

| Var | Used by | Required for MVP? |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_API_KEY` | `utils/helpers/getMapsKey.ts` (Street View + Google Map JS) | **Yes** |
| `MONGO_URI` | `backend/utils/dbConnect.ts` | Replaced by `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` |
| `DB_NAME` | `dbConnect.ts` | Replaced by Supabase project |
| `NEXTAUTH_SECRET` | `pages/api/auth/[...nextauth].ts` | Cut — Supabase auth |
| `NEXTAUTH_URL` | NextAuth runtime | Cut |
| `CRYPTR_SECRET` | `pages/api/auth/[...nextauth].ts`, `pages/api/users/settings.ts` (encrypts user-provided Google Maps key) | Cut — we don't accept user-supplied keys |
| `INTERNAL_API_SECRET` | `backend/routes/games/updateGame.ts`, `pages/api/scores/update.ts` (server-to-server auth between updateGame → scores/update for leaderboard refresh) | Cut — leaderboards are out of MVP |
| `SENDGRID_API_KEY` | `backend/utils/sendEmail.ts` (forgot password) | Cut — Supabase handles |
| `CRON_SECRET` | `pages/api/cron/*.ts` (delete-ongoing, daily-challenge, reset-quota) | Cut |
| `NEXT_PUBLIC_MAPBOX_API_KEY` | `components/GoogleMapsSearch/GoogleMapsSearch.tsx` (place search inside **map editor**) | Cut |
| `NODE_ENV` | Standard | n/a |

### External services (current geohub)
- **Google Maps Platform** — Street View Tiles, Maps JavaScript API, embeddable map. Bills per pano load and per map view. Required.
- **MongoDB** — Atlas or self-hosted. To be replaced by Supabase Postgres.
- **SendGrid** — transactional email. Cut.
- **Mapbox** — geocoding for map editor. Cut.
- **Vercel Analytics** — optional; drop.

### Dev steps (from `README.md`)
1. Install Node + yarn.
2. Create `.env` with the six vars in section 1.
3. `yarn` to install.
4. `yarn dev` → `http://localhost:3000`.
5. Mongo must be reachable on `MONGO_URI` (or use the docker-compose stack).

---

## 3. Game Loop — Round Lifecycle

GeoHub's loop is **single-player only**. Walked through `pages/game/[id].tsx` → `StandardGameView` → `StreetView` → `GuessMap` → `updateGame` API.

### Step 0 — Match creation

- User clicks "Play Now" on `/map/[id]` (`pages/map/[id]/index.tsx:121`).
- `<GameSettingsModal>` opens (`components/modals/GameSettingsModal/GameSettingsModal.tsx`).
- On "Start" with Single Player, `handleStartGame()` fires (`GameSettingsModal.tsx:98`):
  - Dispatches `updateStartTime({ startTime: Date.now() })` — start time **lives in Redux client-side only**.
  - `POST /api/games` → `backend/routes/games/createGame.ts`:
    - Validates session, checks ban, calls `getLocations(mapId, 5)` (`backend/utils/getLocations.ts`) which runs `$sample: { size: 5 }` on Mongo.
    - Inserts a `Game` doc with `round: 1`, `state: 'started'`, full 5-location array embedded.
  - Client `router.push('/game/${res._id}')`.

### Step 1 — Game page mounts

- `pages/game/[id].tsx` fetches `GET /api/games/[id]` → `getGame` → returns `{ game, gameBelongsToUser, mapDetails }`.
- Authorization check: `gameBelongsToUser` must be true; otherwise `<NotFound>` is rendered (`pages/game/[id].tsx:32`).
- View state machine: `useState<GameViewType>('Game')` where `GameViewType = 'Start' | 'Game' | 'Result' | 'FinalResults' | 'Leaderboard'` (`@types/GameView.ts`).
- Renders `<StandardGameView>` (`components/gameViews/StandardGameView.tsx`).

### Step 2 — Pano loads

- `<StreetView>` mounts (`components/StreetView/StreetView.tsx`).
- Reads `location = gameData.rounds[gameData.round - 1]` (line 32). Locations are embedded in the game doc at creation; client trusts them.
- `initializeStreetView()` (line 83):
  - `new google.maps.StreetViewService()` and `new google.maps.StreetViewPanorama(...)`.
  - Adds listener `position_changed` → `trackLocations` (records breadcrumb for undo).
- `loadNewPano()` (line 99):
  - `svService.getPanorama({ location, radius: 50 }, ...)` — radius is 50m fallback for missing panos.
  - `svPanorama.setPano(data.location.pano)`, `setPov(...)`, `setZoom(...)`, `setVisible(true)`.
- Quota-exceeded detection by scanning DOM for "For development purposes only" text (`StreetView.tsx:59-81`). Hacky.

### Step 3 — User pans / moves

- Movement constraints come from `gameData.gameSettings`: `canMove`, `canPan`, `canZoom`, `timeLimit`. Enforced via Google's own pano options (`utils/constants/googleMapOptions.ts:58-75`) plus a capture-phase keyhandler that swallows arrow keys (`StreetView.tsx:240-263`).
- `R` resets to start; `Z` undoes last move (only if `canMove`); breadcrumb stack in `undoLocRef`.
- Every position change pushes onto `undoLocRef` (line 126).

### Step 4 — Minimap click → tentative guess

- `<GuessMap>` (`components/GuessMap/GuessMap.tsx`) renders `<GoogleMapReact>` with `GUESS_MAP_OPTIONS`.
- Click handler `addMarker(e)` (line 103): sets `currGuess = { lat, lng }` and a local `marker`.
- Map size is user-configurable; resize logic in `useGuessMap` hook (`utils/hooks/useGuessMap.tsx`).

### Step 5 — Submit guess

- "Submit Guess" button or `Space`/`Enter` triggers `handleSubmitGuess()` in `StreetView.tsx:144`:
  - Computes `guessTime = (Date.now() - game.startTime) / 1000` from Redux.
  - `PUT /api/games/[id]` with body `{ guess, guessTime, localRound, timedOut, timedOutWithGuess, streakLocationCode }`.
- Server-side `updateGame` (`backend/routes/games/updateGame.ts`):
  - **Re-validates** session and that `userId === game.userId`.
  - Idempotency: rejects if `game.guesses.length === localRound` (line 46).
  - Decides `isGameFinished` (round 5 for standard; mismatch for streak).
  - Calls `calculateDistance(guess, game.rounds[game.round - 1], 'metric'/'imperial')` (`backend/utils/calculateDistance.ts`).
  - Calls `calculateRoundScore(metricDistance, mapDetails?.scoreFactor)` (`backend/utils/calculateRoundScore.ts`).
  - Builds `newGuess: GuessType`, pushes to `game.guesses`, increments `game.round` and `game.totalPoints`.
  - **`findOneAndUpdate` writes the entire mutated `game`.**
  - If finished, fires (non-awaited) `POST /api/scores/update` with `INTERNAL_API_SECRET`. Updates leaderboards and aggregate stats.
- Server returns `{ game, mapDetails }`. Client calls `setView('Result')`.

### Step 6 — Result view

- `<StandardResults>` (`components/resultCards/StandardResults/StandardResults.tsx`) shows the latest guess's points and distance.
- "Next Round" or `Space`/`Enter` fires `handleNextRound`:
  - If `round > 5` → `setView('FinalResults')`.
  - Else dispatch `updateStartTime({ startTime: Date.now() })`, `setView('Game')`. The Street View `useEffect([view])` triggers `loadNewPano()` for the next location.
- `<ResultMap>` (`components/ResultMap/ResultMap.tsx`) draws polylines between guess and actual.

### Step 7 — Match end

- After 5th guess, server sets `state: 'finished'`. Client lands on `setView('Result')` first.
- `<StandardFinalResults>` lets user "Play Again" or "Breakdown" or exit.
- Standalone results page exists at `/results/[id]` for re-viewing.

### State machine summary

```
[lobby /map/[id]] --POST /api/games--> [Game]
[Game] --PUT /api/games/[id] (guess)--> [Result]
[Result] --(round<5)--> [Game]
[Result] --(round==5)--> [FinalResults]
```

There is **no per-round server clock**. The countdown is client-side in `<GameStatus>` (`components/GameStatus/GameStatus.tsx:14-32`); on `timeLeft === 0`, it calls `handleSubmitGuess(true)`. Server believes whatever `guessTime` the client reports.

---

## 4. Scoring Formula

File: `backend/utils/calculateRoundScore.ts` (lines 1-19).

```
if (distance_km * 1000 < 25)   → 5000
score = 5000 * e^(-distance_km / mapFactor)
score < 0 → 0
return round(score)
```

- **Max points per round: 5000** (≤25m hit). Max per match: 25,000.
- `mapFactor` = `MapType.scoreFactor` or fallback `2000`. World-map factor is 2000; smaller maps get a smaller factor via `calculateMapScoreFactor.ts` (ratio against the World map's bounds-distance of 18,150 km), which steepens the falloff so a "USA-only" map can't be max-scored by guessing in the wrong state.

### Where scoring runs — server-validated, with caveats
- **Distance computation**: server, `backend/utils/calculateDistance.ts` (Haversine, R = 6371.071 km / 3958.799 mi).
- **Score computation**: server, in `updateGame.ts:130`.

### Wagering risks in current scoring path
1. `guessTime` is supplied by the client (`StreetView.tsx:152`) using a Redux-stored `startTime`. Server stores it but doesn't validate against round start. **Time-based tiebreakers cannot be trusted.** For wagering, server must stamp round start.
2. The `rounds` (locations) array is embedded in the game doc at creation and **returned to the client** (in `getGame` response). Anyone who reads their own game can see all 5 ground-truth lat/lngs ahead of the round starting. **In a wager context this is fatal.** Need to mint locations server-side per-round, never expose future rounds, and never expose the current round's lat/lng before guess submission.
3. There is no anti-cheat against using developer tools to read `gameData.rounds` from React state. (This is fine for MVP because the side-bet is friendly, but flag it for the Single-Game CSGO product if the policy ever changes.)
4. `adjustedLocation` field in `updateGame.ts:114` lets the client *overwrite* a round's location after the fact (`game.rounds[localRound - 1] = adjustedLocation`). **This is a server-side trust hole that allows the client to change the answer mid-round.** Must be removed.
5. Server's `calculateRoundScore` uses `mapDetails?.scoreFactor` which is computed on map-create from custom map bounds. For MVP we curate one map → fixed factor.

---

## 5. Multiplayer / Duels

### Result: **No real-time multiplayer exists.**

Searched for: socket.io, ws, websocket, pusher, ably, supabase realtime, server-sent events, EventSource, polling endpoints, opponent, duel, versus, battle, matchmaking. No matches in deps or code (the dictionary hits in `grep` are coincidental: `"createMapPolyline"`, the word `"Versus"` in styled-components, etc.).

### What "Challenge" mode actually is
- File: `pages/challenge/[id].tsx`, `pages/api/challenges/*`.
- Async, share-a-link concept:
  1. User A clicks "Challenge" in `<GameSettingsModal>`. Server creates a `challenges` doc with 5 fixed `locations` (`backend/routes/challenges/createChallenge.ts`).
  2. User A's URL is `/challenge/[challengeId]`.
  3. User B opens the link → `createChallengeGame.ts` makes a per-user `Game` doc with the **same `locations`**, marked with `challengeId`.
  4. Both users play independently; on finish they go to `/results/challenge/[id]` which fetches every `Game` with that `challengeId` and shows a leaderboard.
- No live presence. No round sync. No room. A user can take a week to play. Both submit at their own pace.
- Constraint: a user can only play a challenge once (`createChallengeGame.ts:23-29`), enforced by `(challengeId, userId)` count.

### What we need to build for Geohustler 1v1
For the locked-room 1v1 + 5×60s + forfeit-on-disconnect spec, we need to write **all** of this:

- **Matchmaker / queue.** Pair two users at the same wager tier ($1/$5/$10). Could reuse hard2kill's matchmaking module if we have it; otherwise a simple Postgres queue + a worker would do for MVP (5-10 sec target like the bot fill in CSGO).
- **Match doc.** Server-owned: `match_id`, `player_a_id`, `player_b_id`, `wager_cents`, `pot_cents`, `rake_cents`, `state` (`pending|playing|round_complete|finished|cancelled`), `current_round`, `round_started_at`, `winner_id`. 5 location rows linked. Indexes on `(player_*, state)` for "find my active match."
- **Round sync.** Two options:
  - (a) **Polling**: client GETs `/api/match/[id]/state` every 1-2s. Server enforces round timer from `round_started_at + 60s`. Simple, no infra.
  - (b) **Supabase Realtime** subscription to the match row. Free with Supabase. Lets us push opponent's "guess submitted / waiting" status without polling.
  Recommend (b) — Supabase is already in stack, Realtime is free, and 1v1 needs maybe 2 channels per match.
- **Round transition.** Server-controlled. Both players must submit (or 60s elapse) before the next round starts. Server stamps `round_started_at`, broadcasts to both. Locations released **one at a time, after** round start, never in advance.
- **Forfeit on disconnect.** Two layers:
  - Client heartbeats (or Supabase Realtime presence channel) — if a player drops, opponent's UI shows "opponent disconnected." 
  - Server timeout: if no guess + no heartbeat for 30s mid-round, forfeit pot to remaining player.
- **Pot management & payout.** On match-create, debit both wallets atomically with `Game.create`. On match-finish, credit `pot - rake` to winner. Use Postgres transactions, keep wallet ledger append-only. (Port from hard2kill if it has it.)
- **Bonus balance + WR.** Same as hard2kill — wallet has `cash_balance` and `bonus_balance` columns; wagering deducts from bonus first; bonus locks until WR hit (port the helper).
- **Reconnection.** On reconnect, client loads `/api/match/[id]/state`, server returns full state including remaining time on current round (`60 - (now - round_started_at)`). Does not re-stamp.

There is **nothing** to salvage from geohub for this layer.

---

## 6. Map / Location System

### Where locations come from
- File: `backend/utils/getLocations.ts`.
- Two collections:
  - `locations` — **GeoHub-curated** points (official maps).
  - `userLocations` — user-generated points (custom maps from the editor).
- Sampling: `[{ $match: { mapId } }, { $sample: { size: 5 } }, dedupe ]`. Random N from the matched pool.
- "Country Streaks" mode is special: matches `mapId === OFFICIAL_WORLD_ID` filtered by `countryCode IN OFFICIAL_COUNTRIES`.

### Map identity
- `backend/models/map.ts`: `Map` with `creator: 'GeoHub' | ObjectId`, `bounds`, `scoreFactor`, `locationCount`, `previewImg` (a filename in `public/images/mapAvatars`).
- The 4 "official" maps are seeded with hard-coded ObjectIds in `utils/constants/officialMaps.json` and `utils/constants/random.ts`:
  - World: `6185df7a7b54baf63473a53e`
  - Famous Landmarks: `6185dfd47b54baf63473a540`
  - Canada: `6185dff27b54baf63473a541`
  - United States: `6185e0077b54baf63473a542`
- The actual point data is **not in the repo** — it's seeded into the production Mongo. We'd have to either:
  - Scrape geohub.gg for points (TOS-questionable),
  - Use a public dataset (e.g., the GeoGuessr community-shared "A Diverse World" CSV),
  - Generate our own with random sampling against a Street View coverage mask, or
  - Curate a smaller pool by hand (recommended for MVP — 200 hand-picked good-coverage points = bulletproof).

### Restricting the pool for MVP
Yes — trivial. Replace `getLocations(mapId, count)` with a Postgres query against a single `locations` table seeded from a CSV. We never need the multi-map machinery. Recommend: **one curated 200-point world map**, no map picker, no map maker, no selection UI.

---

## 7. Street View Integration

### API surface in use
| Class / call | File | What it does |
|---|---|---|
| `new google.maps.StreetViewService()` | `StreetView.tsx:84` | Server-side stub for fetching pano metadata. |
| `svService.getPanorama({ location, radius: 50 })` | `StreetView.tsx:107` | Resolves a pano near the given lat/lng (50m radius). One call per round. |
| `new google.maps.StreetViewPanorama(div, options)` | `StreetView.tsx:86` | Renders the immersive Street View viewer. |
| `svPanorama.setPano(panoId)` / `setPov(...)` / `setZoom(...)` / `setVisible(true)` | `StreetView.tsx:112-118` | Apply the location and starting heading/pitch/zoom. |
| `svPanorama.addListener('position_changed', ...)` | `StreetView.tsx:91` | Track movement for undo. |
| `new google.maps.LatLngBounds(...)`, `map.fitBounds`, `setCenter`, `setZoom` | `GuessMap.tsx`, `ResultMap.tsx` | Frame the minimap. |
| `<GoogleMapReact>` (3rd-party wrapper) | `GuessMap.tsx`, `ResultMap.tsx`, `SelectionMap.tsx` | Bootstraps the Google Maps JS API and gives a React tree. |

### Where calls run — **all client-side.**
- API key is loaded via `bootstrapURLKeys={getMapsKey(user.mapsAPIKey)}` (`GuessMap.tsx:141`).
- `getMapsKey` (`utils/helpers/getMapsKey.ts`) returns either the user's custom key (encrypted at rest with Cryptr) or `process.env.NEXT_PUBLIC_GOOGLE_API_KEY`.
- **The platform key ships in the JS bundle** (the `NEXT_PUBLIC_` prefix means Next.js inlines it into client code). Locked down only by HTTP referer restriction in Google Cloud Console. Public.
- No proxying through the Next API. No caching. Every page load that mounts a Street View boots up Google's JS lib and hits Google's tile servers directly.

### What gets billed per round
Per Google Maps Platform pricing:
- 1× **Street View Static / Dynamic** session (the immersive viewer) — the most expensive line item; ~$0.014 per session for "Embed" tier or $0.007 for Streetview API per pano.
- 1× **Maps JavaScript API** load for the guess minimap.
- 1× **Maps JavaScript API** load for the result minimap (technically the same load if both share a session; in geohub they're separate components).
- 0× geocoding (only the map editor uses Mapbox geocoding).

For Geohustler at 1v1: **~$0.02-0.04 per round of incremental Google billing**, so $0.10-0.20 per match. At a $1 pot with 10% rake = $0.10 GMV → **margin can be negative on $1 matches**. Flag in section 11.

### Caching
None. Same lat/lng on the same map will issue a fresh `getPanorama` call every time.

---

## 8. Auth + DB Schema

### Auth (current)
- **NextAuth v4** with **Credentials provider only** (`pages/api/auth/[...nextauth].ts`).
- `authorize()` does a Mongo lookup, `bcrypt.compare`, decrypts the user's stored Maps API key with Cryptr, returns a user object.
- JWT strategy (`jwt.maxAge: 30 days`).
- Session shape augmented in `@types/next-auth.d.ts` with `id, avatar, bio, isAdmin, distanceUnit, mapsAPIKey`.
- `getUserId` helper (`backend/utils/getUserId.ts`) calls `getSession({ req })` in every API route.
- Custom register flow at `pages/api/users/register.ts` → `handleRegister.ts` (bcrypt hash, dedupe email/name, insert).
- Custom forgot-password flow at `pages/api/auth/forgot.ts` + `reset-password.ts`. Sends a SendGrid email.
- "Guest" account hardcoded as `GUEST_ACCOUNT_ID = '636ed6784ec6f85e6f18591e'` (used by README login). Gross.
- No OAuth providers configured.

**For Geohustler:** rip the entire `pages/api/auth/*`, the NextAuth `[...nextauth].ts`, all Cryptr usage, all bcrypt usage, the forgot/reset routes, the SendGrid helper. Replace with `@supabase/supabase-js` + `@supabase/auth-helpers-nextjs`. Use email + magic link or Discord OAuth (better for the gambling demographic). Do not let users set their own Google Maps API key.

### Database (MongoDB collections — from `dbConnect.ts:41-53`)

| Collection | Source-of-truth file | Notes |
|---|---|---|
| `users` | `backend/models/user.ts` | Auth + profile. |
| `games` | `backend/models/game.ts` | Per-game state, embedded rounds + guesses. |
| `challenges` | `backend/models/challenge.ts` | Async challenge templates. |
| `maps` | `backend/models/map.ts` | Map metadata, bounds, score factor. |
| `mapLikes` | (no model file) | Document `{ mapId, userId }`. Cut for MVP. |
| `locations` | (`@types/Location.ts`) | Curated location points for official maps. |
| `userLocations` | same shape | Same shape, separate collection so user data can't poison official sampling. |
| `recentSearches` | `@types/RecentSearch.ts` | Per-user search history. Cut. |
| `passwordResets` | (no model) | Token store for forgot-password. Cut. |
| `featureFlags` | `@types/FeatureFlags.ts` | `{ mapsQuotaReached: boolean }`. Cut. |
| `mapLeaderboard` | `backend/models/mapLeaderboard.ts` | Top-N per-map cached scores. Cut. |
| `userBans` | `@types/UserBans.ts` | Ban list for cheaters. Useful pattern; rebuild against Supabase. |
| `analytics` | `@types/Analytics.ts` | Aggregate counters for admin dashboard. Cut. |

### Field-level (the ones that matter)

#### `users` (`backend/models/user.ts`)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | Unique. |
| `email` | string | Unique. |
| `password` | string | bcrypt. **Drop — Supabase owns auth.** |
| `avatar` | `{ emoji: string; color: string }` | Cosmetic. |
| `bio` | string | Cut. |
| `isAdmin` | bool | Reuse pattern; we'll need an admin flag. |
| `createdAt` | Date | |
| `mapsAPIKey` | string (Cryptr-encrypted) | Drop. |
| `distanceUnit` | `'metric' \| 'imperial'` | Cosmetic; default metric. |
| `gameSettings` | `GameSettingsType` | Per-user defaults — irrelevant if we lock match settings. |
| `guessMapSize` | number | UI prefs — keep client-side only. |
| `onNewDomain` | boolean (referenced in `[...nextauth].ts`) | Migration artifact. Drop. |

#### `games` (`backend/models/game.ts`)
| Field | Type | Notes for Geohustler |
|---|---|---|
| `_id` | ObjectId | → `match_id` UUID. |
| `mapId` | string (ObjectId) or special string | Cut → fixed map. |
| `mapName` | string | Cut. |
| `userId` | ObjectId | → `player_a_id`. We'll add `player_b_id`. |
| `userName`, `userAvatar` | string / object | Cut — denorm done elsewhere. |
| `gameSettings` | GameSettingsType | Lock settings → unused. |
| `rounds` | `LocationType[]` (5 items, fully revealed) | **Move out of game doc.** Server-private location table, served one round at a time. |
| `guesses` | `GuessType[]` | Per-round guess records. Keep, but per-player. |
| `round` | number | Current round 1-5. Keep. |
| `totalPoints` | number | Per-player total. Keep. |
| `totalDistance` | `{metric, imperial}` | Cosmetic. Keep metric only. |
| `totalTime` | number | Keep. |
| `difficulty` | string | Cut. |
| `countryCode` | string | Cut. |
| `challengeId` | ObjectId or null | Repurpose into `match_id` linkage. |
| `state` | `'started' \| 'finished'` | Add `'cancelled'`, `'forfeited'`. |
| `mode` | `'standard' \| 'streak'` | Cut streak. |
| `streak` | number | Cut. |
| `isDailyChallenge` | bool | Cut. |
| `createdAt` | Date | Keep. |

#### `challenges` (`backend/models/challenge.ts`)
| Field | Type |
|---|---|
| `_id`, `mapId`, `creatorId`, `creatorName`, `creatorAvatar`, `mode`, `gameSettings`, `locations`, `isDailyChallenge` | — |

Cut entirely. The 1v1 match concept replaces this.

#### `maps`, `mapLikes`, `userLocations`, `mapLeaderboard`, `recentSearches`, `passwordResets`, `featureFlags`, `userBans`, `analytics`
Cut for MVP. Keep `userBans` shape for reference if/when we add anti-cheat.

#### `locations` (current shape, `@types/Location.ts`)
| Field | Type | Notes |
|---|---|---|
| `lat`, `lng` | number | |
| `panoId` | string | Lets us pin a specific pano (rather than letting Google pick within 50m). Strongly recommended for fairness — same pano for both players. |
| `heading`, `pitch`, `zoom` | number | Starting POV. Important for fairness. |
| `mapId` | ObjectId | Cut. |
| `countryCode` | string | Optional metadata. |

### Proposed Geohustler Postgres schema (sketch — not exhaustive)

```
locations(
  id uuid pk,
  lat numeric, lng numeric,
  pano_id text, heading numeric, pitch numeric, zoom numeric,
  country_code text
);

matches(
  id uuid pk,
  player_a uuid fk profiles, player_b uuid fk profiles,
  wager_cents int, pot_cents int, rake_cents int,
  state text check (state in (...)),
  current_round int default 1,
  round_started_at timestamptz,
  winner_id uuid fk profiles,
  created_at, finished_at
);

match_rounds(
  match_id uuid fk, round_no int,
  location_id uuid fk locations,
  unique(match_id, round_no)
);

match_guesses(
  match_id uuid fk, player_id uuid fk, round_no int,
  lat numeric, lng numeric,
  distance_km numeric, points int, time_ms int,
  submitted_at timestamptz,
  primary key (match_id, player_id, round_no)
);

wallets, ledger_entries, deposits, withdrawals — port from hard2kill.
```

---

## 9. Frontend File Map

### Pages (`pages/*` non-API)

| File | Purpose | Core loop? |
|---|---|---|
| `_app.tsx` | App shell: SessionProvider + Redux + ThemeProvider + Toaster | **Core (rewrite)** |
| `_document.tsx` | Custom document | Core (likely cut) |
| `index.tsx` | Home (hero + 4 official maps + 2 gamemodes) | Cut — Geohustler home is "Find Match" CTA |
| `login.tsx`, `register.tsx`, `forgot.tsx`, `reset-password/[token].tsx` | Custom auth pages | Cut — Supabase auth |
| `404/index.tsx` | 404 page | Keep |
| `map/[id]/index.tsx` | Map detail page; "Play Now" button → settings modal → create game | Cut (no map picker) |
| `maps/index.tsx` | Browse maps grid | Cut |
| `my-maps/index.tsx` | User's custom maps | Cut |
| `liked/index.tsx` | Liked maps | Cut |
| `create-map/[mapId].tsx` | Map editor | Cut |
| **`game/[id].tsx`** | Active game UI | **Core — adapt for 1v1** |
| **`results/[id].tsx`** | Game replay | Adapt |
| `results/challenge/[id].tsx` | Multi-game challenge replay | Cut |
| **`challenge/[id].tsx`** | Async challenge entry | Cut (replaced by match flow) |
| `daily-challenge/index.tsx` | Daily challenge entry | Cut |
| `streaks/index.tsx` | Country streaks entry | Cut |
| `ongoing/index.tsx` | List of unfinished games | Cut |
| `search/index.tsx` | Global search | Cut |
| `user/[id].tsx`, `user/settings.tsx` | Profile + settings | Cut |
| `admin/analytics/index.tsx` | Admin dashboard | Cut |

### Components (`components/*`)

| Component | Purpose | Core loop? |
|---|---|---|
| **`StreetView/`** | Pano + controls + GameStatus + minimap container | **Core — adapt** |
| **`GuessMap/`** | Click-to-guess minimap | **Core — keep** |
| **`ResultMap/`** | Polyline result map | **Core — keep, adapt for opponent guess** |
| **`Marker/`** | Guess + actual pin renderer | **Core — keep** |
| **`GameStatus/`** | HUD: round / points / timer | **Core — adapt for 1v1 (opponent score, server-driven timer)** |
| **`StreetViewControls/`** | Back-to-start, undo | **Core — keep** |
| `gameViews/StandardGameView.tsx` | Wires Street View + Result + Final | Adapt |
| `gameViews/StreakGameView.tsx` | Streak variant | Cut |
| `resultCards/StandardResults` | After-round card | Adapt |
| `resultCards/StandardFinalResults` | After-match card | Adapt — show winner / payout |
| `resultCards/StreakContinueCard`, `resultCards/StreakEndedCard` | Streak | Cut |
| `Results/LeaderboardCard` | Multi-player leaderboard for challenges | Adapt — repurpose for 2-player match summary |
| `MapLeaderboard/` | Per-map top scores | Cut |
| `MapPreviewCard`, `MapStats`, `MapCards/` | Map browse UI | Cut |
| `SelectionMap/` | Map editor (deck.gl markers) | Cut |
| `GoogleMapsSearch/` | Mapbox geocoding for editor | Cut |
| `StreaksGuessMap`, `StreaksResultMap`, `StreaksSummaryMap`, `StreaksLeaderboard`, `StreakCountryList`, `StreakMapStats` | Streak mode | Cut |
| `DailyChallengeMapStats`, `DailyChallengeWinners` | Daily challenge | Cut |
| `ChallengeStart` | "You've been challenged" landing page | Cut |
| `modals/GameSettingsModal` | Pre-match settings (move/pan/zoom/time) | Cut — settings are locked |
| `modals/AuthModal` | Login modal | Cut |
| `modals/AvatarPickerModal`, `modals/CreateMapModal`, `modals/SaveMapModal`, `modals/DestroyModal` | Various | Cut |
| `modals/DailyQuotaModal` | "Bring your own API key" prompt | Cut |
| `modals/MainModal` | Modal primitive | Keep |
| `Admin/Analytics/` | Admin UI | Cut |
| `errorViews/NotFound` | 404 view | Keep |
| `layout/Layout`, `layout/Navbar`, `layout/Sidebar`, `layout/MobileNav`, `layout/PageHeader`, `layout/WidthController`, `layout/LoadingPage` | Shell | Adapt — strip nav links |
| `system/*` (Avatar, Button, Checkbox, Modal, Slider, Spinner, Tabs, Toggle, etc.) | UI primitives | Keep |
| `dropdowns/CreateMapDropdown` | Map editor entry | Cut |
| `selects/*` | Generic selects | Keep where used |
| `skeletons/*` | Loading skeletons | Keep where used |
| `Meta/`, `AppLogo/`, `VerifiedBadge/`, `TextWithLinks/`, `GamemodeCard/` | Various small | Keep / cut individually |

### Backend / utils

| Module | Notes |
|---|---|
| **`backend/utils/calculateDistance.ts`** | Pure Haversine. **Keep verbatim.** |
| **`backend/utils/calculateRoundScore.ts`** | Pure formula. **Keep verbatim** (ditch the scoreFactor lookup; use a fixed value). |
| `backend/utils/calculateMapScoreFactor.ts` | Multi-map factor calc. Cut. |
| `backend/utils/getLocations.ts` | Mongo `$sample`. Rewrite for Postgres `ORDER BY random() LIMIT 5`. |
| `backend/utils/getUserId.ts` | NextAuth getSession. **Replace** with Supabase `getUser` from cookies. |
| `backend/utils/dbConnect.ts` | Mongo init. **Cut** entirely; Supabase client is stateless. |
| `backend/utils/sendEmail.ts` | SendGrid. Cut. |
| `backend/utils/throwError.ts`, `catchErrors.ts` | API helpers. Keep / port. |
| `backend/utils/isUserBanned.ts`, `unbanUser.ts` | Ban-list. Cut for MVP, keep pattern in mind. |
| `backend/utils/isUserAnAdmin.ts` | Admin check. Cut. |
| `backend/queries/getMapFromGame.ts` | Per-game map lookup. Cut. |
| `backend/queries/topScores.ts`, `topStreaks.ts` | Leaderboard queries. Cut. |
| `backend/validations/*` | Zod schemas. Keep pattern. |
| `pages/api/games/[id].ts`, `pages/api/games/index.ts` | Game CRUD. **Adapt** — replace with `match` endpoints. |
| `pages/api/scores/update.ts` | Leaderboard update. Cut. |
| `pages/api/cron/*` | Cron stubs. Cut. |
| `redux-utils/store.ts`, `slices/userSlice.ts`, `slices/gameSlice.ts` | Persisted Redux. **Trim severely** — don't persist game state across reloads in a wager context (see risks). |

---

## 10. Keep / Adapt / Rip / Rebuild Inventory

### KEEP (use as-is)

| Item | Path |
|---|---|
| Distance formula | `backend/utils/calculateDistance.ts` |
| Score formula | `backend/utils/calculateRoundScore.ts` |
| Real-country-code helper | `utils/helpers/getRealCountryCode.ts` |
| Distance / time formatters | `utils/helpers/formatDistance.ts`, `formatStatusTimer.ts`, `formatLargeNumber.ts` |
| Marker component | `components/Marker/Marker.tsx` |
| Result polyline helper | `utils/helpers/createMapPolyline.ts` |
| Google Maps options | `utils/constants/googleMapOptions.ts` |
| Key codes | `utils/constants/keyCodes.ts` |
| UI primitives | `components/system/*` |
| 404 page | `pages/404/index.tsx` |
| Loading page | `components/layout/LoadingPage` |
| Toast helper | `utils/helpers/showToast.ts` |
| `mailman` fetch wrapper | `utils/helpers/mailman.ts` |
| Modal primitive | `components/modals/MainModal` |
| Zod validation pattern | `backend/validations/*` |
| Theme + global styles | `utils/theme/*`, `styles/globals.css` |

### ADAPT (port logic, swap data layer / multiplayer-aware)

| Item | What to change |
|---|---|
| `components/StreetView/StreetView.tsx` | Strip streak branch, strip undo (move = false in MVP), drop quota-modal hack, drop Redux startTime — read round timer from server. Listen to opponent state. |
| `components/GuessMap/GuessMap.tsx` | Drop user.guessMapSize, drop user.mapsAPIKey, drop bounds-zoom on small maps (single fixed map). |
| `components/ResultMap/ResultMap.tsx` | Add second player's marker + polyline (different color). |
| `components/GameStatus/GameStatus.tsx` | Show opponent's score, opponent's "submitted" status; timer driven by `round_started_at` from server. |
| `components/gameViews/StandardGameView.tsx` | Wire to match doc, not single-player game. |
| `components/resultCards/StandardResults.tsx` | Show "you / opponent" side-by-side. Wait state for slow opponent. |
| `components/resultCards/StandardFinalResults.tsx` | Show winner badge + payout amount. |
| `components/Results/LeaderboardCard` | Repurpose for 2-row match summary. |
| `pages/game/[id].tsx` | Replace with `pages/match/[id].tsx`. Subscribe to match channel; gate render on round state. |
| `pages/results/[id].tsx` | Replace with `pages/match/[id]/result.tsx` showing both players' guesses. |
| `pages/api/games/*` | Replace with `pages/api/match/*` (create, join, get-state, submit-guess). |
| `pages/api/users/register.ts`, `pages/api/users/login.ts` | Cut → use Supabase. |
| `backend/utils/getUserId.ts` | Re-implement against Supabase server client. |
| `backend/utils/getLocations.ts` | Postgres random sample, server-private (never returned to client up-front). |
| `redux-utils/*` | Trim to UI-only state (modals open, toasts). Move all game state into React Query / Supabase Realtime subscription. |
| `components/layout/*` | Strip sidebar links, profile dropdown, search bar. |

### RIP (delete entirely)

| Surface | Reason |
|---|---|
| All NextAuth: `pages/api/auth/[...nextauth].ts`, `pages/login.tsx`, `pages/register.tsx`, `pages/forgot.tsx`, `pages/reset-password/[token].tsx`, `pages/api/auth/forgot.ts`, `pages/api/auth/reset-password.ts` | Replaced by Supabase |
| Mongo client: `backend/utils/dbConnect.ts`, all `collections.*` calls | Replaced by Supabase |
| `bcryptjs`, `cryptr`, `@sendgrid/mail`, `dotenv` (Next has built-in), `mongodb` deps | No longer needed |
| Streak mode: `components/Streaks*`, `components/StreakCountryList`, `components/resultCards/Streak*`, streak fields in `Game`, `getRealCountryCode.ts` consumers, `utils/constants/countries.ts`, `polygonStyles.ts`, `@turf/*` | Out of MVP scope |
| Daily challenge: `pages/daily-challenge`, `pages/api/challenges/daily.ts`, `pages/api/cron/create-daily-challenge.ts`, `components/DailyChallenge*`, `pages/api/scores/challenges/daily/previous.ts` | Out of MVP scope |
| Async challenges: `pages/challenge/[id].tsx`, `pages/results/challenge/[id].tsx`, `pages/api/challenges/*`, `backend/routes/challenges/*`, `components/ChallengeStart/` | Replaced by 1v1 match |
| Map maker: `pages/create-map/[mapId].tsx`, `pages/my-maps/index.tsx`, `pages/maps/index.tsx`, `pages/liked/index.tsx`, `components/SelectionMap/`, `components/MapCards/`, `components/MapPreviewCard/`, `components/MapStats/`, `components/MapLeaderboard/`, `components/GoogleMapsSearch/`, `components/dropdowns/CreateMapDropdown/`, `pages/api/maps/*`, `backend/routes/maps/*`, `@deck.gl/*`, `allotment`, `react-linkify`, `@turf/*`, `file-saver`, Mapbox env var | One curated map only |
| Profiles / social: `pages/user/[id].tsx`, `pages/user/settings.tsx`, `components/VerifiedBadge`, `components/Avatar*Modal`, `components/system/Searchbar`, `pages/search/`, `pages/api/search/*`, `pages/api/users/*` (except auth-replacement), recent-searches | Out of MVP scope |
| Likes: `pages/api/likes/*`, mapLikes collection | Out of MVP scope |
| Leaderboards: `pages/api/scores/*`, `mapLeaderboard` collection, `backend/queries/topScores.ts`, `topStreaks.ts` | Out of MVP scope |
| Admin: `pages/admin/`, `components/Admin/`, `pages/api/analytics/`, `backend/routes/getAnalytics.ts` | Out of MVP scope |
| Cron: `pages/api/cron/*` and `backend/routes/cron/*` | Replace with Supabase scheduled functions if needed |
| Ongoing games: `pages/ongoing/index.tsx`, `getUnfinishedGames.ts`, `delete-ongoing-games` cron | Replaced by single active-match concept |
| Quota detection: `components/modals/DailyQuotaModal`, the DOM-string scan in `StreetView.tsx:59-81` | Hacky; we monitor billing in Google Cloud directly |
| User-supplied API keys: `Cryptr` usage, `mapsAPIKey` field, `getMapsKey` fallback logic | Single platform key only |
| Guest account special-casing | Real accounts only |

### REBUILD FROM SCRATCH (greenfield code Geohub does not have)

| Module | Why |
|---|---|
| **Matchmaker / queue** | No multiplayer in geohub. Need pair-by-tier, ~5-10s fill (mirror CSGO bot-fill UX). |
| **Match state machine** | Server-owned `matches` table + state transitions (`pending → playing → round_complete → finished/forfeited`). |
| **Server-authoritative round timer** | Stamp `round_started_at`, enforce 60s, reject late guesses. |
| **Realtime opponent presence** | Supabase Realtime channel per match for opponent's guess-submitted / disconnected status. |
| **Server-private locations** | Never embed all 5 lat/lngs in the client payload. Drip one location per round, after round start. |
| **Wager pot + payout transactions** | Atomic debit on match-create, atomic credit on match-finish. Port wallet ledger from hard2kill. |
| **Bonus balance + wagering requirement** | Same as hard2kill side bet — bonus deducts first, locks until WR met. Port from hard2kill. |
| **Stripe deposits / withdrawals** | Out of geohub entirely. Port from hard2kill. |
| **Forfeit-on-disconnect** | Heartbeat or presence-channel watcher + 30s no-guess timeout = pot to opponent. |
| **Anti-double-spend / idempotency on guess submit** | Per `(match_id, player_id, round_no)` unique constraint + server-side check. |
| **Reconnection / resume** | Server returns full state including remaining round time on `/match/[id]/state`. |
| **Supabase auth integration in API routes** | New `getUserId` helper using `@supabase/auth-helpers-nextjs`. |

---

## 11. Risks & Surprises

1. **Locations live in the client payload.** `getGame` returns the full `rounds: LocationType[]` (5 lat/lngs) on first load (`backend/routes/games/getGame.ts:40`). Anyone who Inspects state can read every answer. This is the **single biggest gotcha** for the wagering port — the data shape needs to fundamentally change before money touches it.
2. **`adjustedLocation` server trust hole.** `updateGame.ts:114` accepts a client-sent location and overwrites the round's ground truth. That field must be removed, not just unused.
3. **Client-supplied `guessTime`.** `StreetView.tsx:152` computes `(Date.now() - reduxStartTime) / 1000` and the server stores it verbatim. For tiebreakers under wager, server must own the round clock.
4. **Old stack.** Next 12 + React 17 + Node 14 in Dockerfile. Path aliases use TypeScript paths (works) but Server Components don't exist. Either upgrade Next/React when porting or accept Pages Router going forward. Recommend: **fresh `create-next-app@latest` (Next 14 + App Router) and copy components in piecemeal**, rather than upgrading geohub in place.
5. **Google Maps cost.** Per-round bill is ~$0.02-0.04. On a $1 wager with $0.10 rake, **margin is razor-thin or negative**. Either (a) raise minimum wager to $5, (b) self-host pano tiles (TOS violation), or (c) take cost into the rake math. The CLAUDE.md says ignore TOS/cost — but ignoring isn't the same as not knowing. Flag this for pricing decisions.
6. **Google Maps key is public.** `NEXT_PUBLIC_*` ships in the JS bundle. Lock it down with HTTP-referer restrictions in Google Cloud Console plus a low daily quota. There is no way to fully proxy Street View through a backend (the immersive viewer needs the JS SDK loaded client-side). Accept this.
7. **No location data shipped in the repo.** The 4 official maps' `locations` rows live only in Ben's production Mongo. We must seed our own. Hand-curating 100-200 good points is the safest path for MVP fairness; harvesting from third-party sources risks both quality variance and TOS issues. Budget ~half-day for curation.
8. **`google-map-react` is unmaintained-ish.** Last meaningful release ~2022. It works, but consider migrating to `@vis.gl/react-google-maps` if we ever revisit. Not a blocker for MVP.
9. **Streak mode is deeply intertwined with standard mode** at the type level — `Game.mode`, `Game.streak`, `Game.isDailyChallenge`, `streakLocationCode` all live on the same type. Cleanly removing it means a real refactor of `@types/Game.ts` and `updateGame.ts:53-66`. Easier to **leave the streak branch dead-code in updateGame for now** and just never call it; or copy `updateGame.ts` and delete the streak path.
10. **Tests are stubs.** `tests/Game.test.ts` is one comment line. Don't expect any safety net. Plan unit tests around the score formula and matchmaker before going live with money.
11. **Redux-persist will rehydrate stale game state.** `redux-persist` is whitelisted for `user` + `game`. If a player reloads mid-match, hydrated `gameSlice.startTime` will mismatch server's `round_started_at`, causing time-budget mismatches. **Stop persisting `game`** in Geohustler.
12. **The "guest account" hardcoded id (`636ed6784ec6f85e6f18591e`)** is referenced in `pages/api/users/settings.ts` to block setting changes. Easy to miss. Drop alongside the rest of the credentials auth.
13. **`pages/api/scores/update.ts` is called fire-and-forget from `updateGame`** with an internal-secret header. If we keep any leaderboard-style update post-match (e.g., for stats), we'd want a Supabase RPC inside the same transaction, not a self-fetch.
14. **No rate limiting anywhere.** Every API route is open to authenticated users without per-route limits. For wagering, add at minimum: matchmaking-queue debounce (1 join per 3s), guess-submit (1 per round), and login attempt limits (Supabase covers this).
15. **`StyledComponents v5` + Next 14 (App Router)**: known SSR friction. If we upgrade, plan time to migrate styling, or accept Pages Router as the path of least resistance for MVP.

---

## Quick file lookup index (high-impact files)

- Score formula: `backend/utils/calculateRoundScore.ts:1-19`
- Distance formula: `backend/utils/calculateDistance.ts:1-37`
- Location sampling: `backend/utils/getLocations.ts:7-49`
- Game create: `backend/routes/games/createGame.ts:6-49`
- Guess submit: `backend/routes/games/updateGame.ts:17-176`
- Game read (auth check + map lookup): `backend/routes/games/getGame.ts:8-43`
- Street View viewer: `components/StreetView/StreetView.tsx:42-124`
- Guess minimap: `components/GuessMap/GuessMap.tsx:1-176`
- Result polylines: `components/ResultMap/ResultMap.tsx:1-140`
- HUD + timer: `components/GameStatus/GameStatus.tsx:1-101`
- Match-creation modal: `components/modals/GameSettingsModal/GameSettingsModal.tsx:1-249`
- Auth: `pages/api/auth/[...nextauth].ts:1-83`
- Mongo init: `backend/utils/dbConnect.ts:1-60`
- Game type: `backend/models/game.ts:1-33`
- Map type: `backend/models/map.ts:1-24`
- User type: `backend/models/user.ts:1-15`
- Location type: `@types/Location.ts:1-15`
- Guess type: `@types/Guess.ts:1-15`
- Game-settings type: `@types/GameSettings.ts:1-9`
- View state machine: `@types/GameView.ts:1-3`
