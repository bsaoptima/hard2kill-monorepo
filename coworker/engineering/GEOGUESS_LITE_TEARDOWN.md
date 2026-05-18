# Geoguess-Lite Teardown — Reference for Geohustler

Date: 2026-04-27
Source: `/Users/stefan/Desktop/Code/game/geoguess-lite` (read-only study)
Target: `/Users/stefan/Desktop/Code/game/geohustler` (does NOT exist yet)
Scope: Same as the GeoHub teardown — strip a GeoGuessr clone down to a 1v1 wagering platform, MVP-grade, single-game loop only, replace auth/DB with Supabase + Stripe + bonus-balance.

**One-line summary:** Vue 3 + Vite SPA on the front, Python Lambdas (AWS SAM) for REST, Python **Firebase Functions** as a real-time round-state oracle, **Firebase Realtime Database** as the multiplayer transport, **Mapillary** (not Google) for panoramas, **Mapbox** for the guess minimap, and **Neon Postgres** for users + image pool + daily challenge + leaderboards. **Real, working multiplayer N-player rooms exist** — closer to what we need than geohub by a country mile, but the location-secrecy property is still violated (lat/lng arrives client-side via Mapillary's pano response, exactly as a side-channel). Total source files (excluding generated OpenAPI client and shadcn UI primitives): ~150. Score and distance are computed client-side and written to a publicly-writable RTDB path — we'd need to relocate scoring to a server.

---

## 1. Tech Inventory

### Three deployable units

| Unit | Path | Stack | Runtime |
|---|---|---|---|
| Client SPA | `client/` | Vue 3 + Vite + TypeScript | Browser; static-hosted on Cloudflare per README |
| Lambda API | `server/` | Python 3.13 + AWS SAM + API Gateway + Firebase Authorizer | AWS Lambda |
| Realtime triggers | `functions/` | Python 3.13 + Firebase Functions (`firebase_functions`) | Firebase / Google Cloud |

### Client (`client/package.json`)

| Dep | Version | Purpose | Verdict for Geohustler |
|---|---|---|---|
| `vue` | `^3.5.22` | Frontend framework, `<script setup>` Composition API everywhere | Keep if we go this route |
| `vue-router` | `^4.6.3` | Client-side router | Keep |
| `pinia` | `^3.0.4` | State store (only `gameConfig` store; almost trivial) | Trim |
| `vuefire` | `^3.2.2` | Vue + Firebase auth/RTDB integration | **Rip** — replace with Supabase auth |
| `firebase` | `^12.6.0` | Firebase JS SDK (auth + RTDB) | **Rip** for auth; **conditional rip** for RTDB (see section 5) |
| `@tanstack/vue-query` | `^5.91.2` | Async/cache layer on REST calls | Keep — useful for Geohustler |
| `mapillary-js` | `^4.1.2` | Mapillary's WebGL street-view viewer (the "Mapillary Viewer") | **Rip** — Geohustler is on Google Street View |
| `mapbox-gl` | `^3.18.0` | Mapbox vector minimap for guess + result | **Rip** — replace with Google Maps JS for parity with our cost model, OR keep if we'd rather pay Mapbox's cheaper tier |
| `@vueuse/core` | `^14.1.0` | Vue composition utilities | Keep |
| `tailwindcss` + `@tailwindcss/vite` | `^4.1.17` | Styling (Tailwind v4) | Keep |
| `reka-ui` + shadcn-style components in `components/ui/` | — | Headless UI primitives (Radix-equivalent for Vue) | Keep |
| `lucide-vue-next` | `^0.553.0` | Icons | Keep |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | — | shadcn-style class utilities | Keep |
| `emoji-picker-element` | `^1.28.0` | Avatar emoji picker | Cut |

Build / dev / test commands:
- `npm run dev` → `vite`
- `npm run build` → `run-p type-check build-only` (vue-tsc + vite build)
- `npm run preview` → `vite preview`
- `npm run test:unit` → `vitest`
- `npm run test:e2e` → `playwright test`
- `npm run lint`, `npm run lint:style`, `npm run format` — ESLint, stylelint, Prettier

Node engines: `^20.19.0 || >=22.12.0`. TypeScript 5.9. Vite 7.

The client also has a generated **OpenAPI typescript-fetch SDK** under `client/src/services/` (about 50 generated files for ~6 endpoints — bloats the visible file count but is auto-generated from `server/openapi/openapi.yml`). Regenerated with the command in `client/README.md:80`.

### Lambda API (`server/`)

Python 3.13. Layout: per-feature directories (`users/`, `dailyChallenges/`, `dailyScores/`, `multiplayerRounds/`, `images/`, `health/`, `scheduled/`, `core/`). Each feature has 4 files: `handler.py` (Lambda entry), `service.py` (business logic), `repository.py` (Postgres SQL), `model.py` (Pydantic).

| Dep | Purpose | Verdict |
|---|---|---|
| `aws_lambda_powertools` | Logging/parser/typing for Lambda | Cut — we'd use Next.js API routes |
| `psycopg` | Postgres driver (Neon) | Replace with Supabase Postgres |
| `firebase_admin` | Verify Firebase ID tokens; write to Firebase RTDB from Lambda | Rip auth; conditional on RTDB |
| `pydantic` | Schema validation (server) | Replace with Zod on the Next.js side |
| `boto3` | Secrets Manager | Cut |

`server/template.yaml` defines: 9 Lambdas + 2 API Gateways (one auth-gated, one with API-key for the public `/images` endpoint with throttle 5 rps / 20 burst), plus EventBridge schedules for the daily challenge cron.

### Firebase Functions (`functions/main.py`)

A single 175-line Python file. Runtime: Python 3.13 on Firebase. Three functions:

1. `on_player_loaded_round` — listens to `/rooms/{room_id}/players/{user_id}/loadedRound` writes; if everyone in the room has loaded the same round, sets `roundState/{round}/hasEveryoneLoaded = true`.
2. `on_round_guesses_updated` — listens to `/rooms/{room_id}/rounds/{round_number}/guesses`; if all connected players have guessed, advances `currentRound` or sets `status: 'finished'` on round 5.
3. `cleanup_old_rooms` — daily cron, deletes rooms older than 24h.

These functions are the **server-authoritative round transition logic**. Without them, the room is just a shared mutable JSON blob. With them, you get genuine state-machine progression.

### Languages

TypeScript (client), Python (server + functions). Two repos in one. No JavaScript at all. ~150 source files split as 99 (client TS/Vue, excluding generated SDK), 52 (server Python), 1 (functions). Plus shadcn UI primitives and OpenAPI generated client.

---

## 2. Run Requirements

### Required env vars

#### Client (`.env.example`)

| Var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Auth-gated API Gateway URL |
| `VITE_PUBLIC_API_BASE_URL` | Public (API-key) Gateway URL — for `/images` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Firebase JS SDK config |
| `VITE_MAPILLARY_TOKEN` | Mapillary client token |
| `VITE_MAPBOX_TOKEN` | Mapbox public token |
| `VITE_PUBLIC_API_KEY` | API key for the public API gateway (`/images`) |

#### Server (`server/secret.example.json`, loaded via AWS Secrets Manager)

| Field | Purpose |
|---|---|
| `lambda_resource_arn` | ARN scope for the Firebase authorizer policy |
| `neon_db_uri` | Postgres connection string (Neon) |
| `mapillary_token` | (declared but no Lambda actually reads it directly — Mapillary calls all happen in the browser) |
| `firebase_database_url` | RTDB URL for the multiplayerRounds Lambda to write into |
| `firebase_service_account` | Firebase Admin SDK service account (for token verification + DB writes) |

### External services

- **Firebase**: Auth (Google sign-in), Realtime Database (rooms), Functions (round-state oracle), Analytics (frontend)
- **AWS**: Lambda, API Gateway, Secrets Manager, EventBridge (cron)
- **Neon**: serverless Postgres for users, images table, daily challenges, daily scores
- **Mapillary**: street-view-equivalent imagery (free up to ~30k requests/mo at time of writing — non-trivial wager-relevant difference vs Google Maps)
- **Mapbox**: minimap rendering (geohub uses Google Maps JS instead)

### Dev setup (from `server/README.md`)

1. `docker compose up -d` (LocalStack for Secrets Manager mock)
2. `awslocal secretsmanager create-secret ...` (seed the secret JSON)
3. `sam build --use-container`
4. `sam local start-api ...`
5. Client: `npm install && npm run dev`
6. Functions deployed separately via `firebase deploy`

This is **far more involved** than geohub's `yarn dev`. Local dev requires Docker + LocalStack + AWS CLI + AWS SAM CLI + a real Firebase project (RTDB cannot be emulated convincingly for the trigger functions), plus a Neon DB.

---

## 3. Game Loop — Round Lifecycle

There are three loops: **single-player** (no server state), **daily challenge** (server-known image_ids, daily seed), and **multiplayer** (Firebase RTDB room). I'll focus on multiplayer because that's the one that maps onto Geohustler's 1v1.

### Step 0 — Lobby creation (`client/src/pages/GamePage.vue:625-683`)

- Host enables "I am the host" checkbox in `GamePage.vue` and clicks Start.
- `useMultiplayerRoom.createRoom()` (`client/src/composables/useMultiplayerRoom.ts:162-204`):
  - Generates a 4-digit `roomId` (`Math.floor(Math.random() * 10000)`) — no collision check, just hopes.
  - Writes the entire room state under `/rooms/{roomId}` in Firebase RTDB:
    ```ts
    {
      id, config, players: { [hostId]: { ...host, isHost: true } },
      createdAt: Date.now(), status: 'waiting', currentRound: 0
    }
    ```
  - Sets up `onDisconnect(playerRef).update({ isConnected: false })` so a closed tab marks the host disconnected automatically. **This is one of the nicer pieces of the codebase.**
  - Subscribes to the room ref via `onValue` for live updates.
- Joiner: `joinRoom(roomId, player)` does the same, but errors if `room.status !== 'waiting'`.
- Both navigate to `/game/multiplayer/{roomId}`.

### Step 1 — Lobby waits for host to start (`MultiplayerGamePage.vue` + `LobbyComponent.vue`)

- Renders player list, game config (read-only for non-hosts).
- Start button disabled until `players.length >= 2 && myself.isHost`.

### Step 2 — Host clicks Start → server-side rounds creation

- `startGame()` in `MultiplayerGamePage.vue:596-610`: POSTs to `/multiplayer-rounds` with `{ roomId, onlyPanorama }`.
- Lambda `multiplayerRounds.handler.lambda_handler` → `service.create_multiplayer_rounds_service` (`server/src/multiplayerRounds/service.py`):
  - Sets room `status = 'loading'`, `currentRound = 1`.
  - Calls `images.repository.get_random_images(is_pano)` — `SELECT id, is_pano FROM images WHERE is_pano = ? ORDER BY RANDOM() LIMIT 5` (`server/src/images/repository.py:7-22`).
  - For each of 5 rounds, writes `{"imageId": image.id, "guesses": {}}` to `/rooms/{roomId}/rounds/{round_num}`.
  - Sets `status = 'loaded'`.
- **Critical:** the server writes only `imageId`, never lat/lng. The actual coordinates are not in the server's images table at all (`Image` model is `{id, is_pano}` only — `server/src/images/model.py:4-7`).

### Step 3 — Round starts: load pano

- Client watches `isLoaded` (`MultiplayerGamePage.vue:330-338`); once `loaded`, calls `updateCurrentRoundImageId()` to read the image ID from RTDB.
- Each player marks themselves loaded by writing `players/{id}/loadedRound = currentRound` (`MultiplayerGamePage.vue:340-348`).
- **Firebase Function `on_player_loaded_round` fires** (`functions/main.py:10-77`): if all connected players' `loadedRound >= currentRound`, sets `roundState/{round}/hasEveryoneLoaded = true` and (only on round 1) flips `status = 'playing'`.
- Client watches `hasEveryoneLoaded` (`MultiplayerGamePage.vue:350-358`); once true, calls `streetViewRef.loadRandomView(imageId)` which invokes Mapillary's `viewer.moveTo(imageId)` then `viewer.getPosition()` — this is where **lat/lng materializes on the client**.
- `onImageLoaded(position, imageId)` is emitted with the lat/lng (`MultiplayerGamePage.vue:457-462`); client starts the local timer.

### Step 4 — User guesses

- `MapComponent.vue` Mapbox map; click handler emits `markerPlaced({lat, lng})`.
- "Make Guess" button → `makeGuess()` (`MultiplayerGamePage.vue:477-506`):
  - Stops local timer.
  - **Computes distance and score on the client**: `calculateDistance(imagePosition, markerPosition)` and `calculateScore(distance)` (`client/src/utils/index.ts:37-63`).
  - Writes `{lat, lng, score, distance}` to RTDB at `/rooms/{roomId}/rounds/{currentRound}/guesses/{userId}`.
- **Firebase Function `on_round_guesses_updated` fires** (`functions/main.py:80-135`): counts guesses, compares to `connected_players_count`, sets `roundState/{round}/hasEveryoneGuessed = true` if everyone in, then either advances `currentRound++` or sets `status = 'finished'` on round 5.
- Client watches `hasEveryoneGuessed` (`MultiplayerGamePage.vue:360-401`): renders all opponents' markers + correct location, animates the map to show distance, populates totals.

### Step 5 — Round transition

- "Next Round" button → `nextRound()` (`MultiplayerGamePage.vue:556-570`): resets local UI state, marks player loaded for next round in RTDB. Loop returns to step 3.

### Step 6 — Match end

- Round 5 + everyone-guessed → `status = 'finished'`. Client renders `GameSummaryMultiplayerComponent` (full breakdown across 5 rounds, all players).
- Client also fires `mutateUserUpdate` to bump aggregates (gamesPlayed, bestScore, averageScore) on its own profile via the REST API.

### State machine

```
waiting --(host starts)-> loading --(rounds saved)-> loaded
loaded --(all loaded round 1)-> playing
playing --(all guessed round N<5)-> playing (next round)
playing --(all guessed round 5)-> finished
```

### Where the timer lives

- `useTimer` (`client/src/composables/useTimer.ts:1-82`) is a **client-local timer** based on `performance.now()`.
- Per-round, started on `onImageLoaded`, stopped on `makeGuess`. On `isExpired`, fires `handleTimeExpired()` which writes a guess (or `{lat: -1, lng: -1, score: 0}` if no marker) to RTDB.
- **There is no server clock for the round.** The Firebase Functions don't enforce a deadline; they only react to writes. Two players can disagree on remaining time and the system accepts whichever guess writes first.

### Disconnection model

- `onDisconnect(playerRef).update({ isConnected: false })` is set on join. RTDB sets `isConnected = false` automatically when the websocket drops.
- The `on_round_guesses_updated` function counts only `isConnected` players for the "everyone guessed" check — so **a player who disconnects mid-round is silently dropped from the round-end gate**, which means the round advances without their guess. That's basically forfeit-of-round. The pot logic obviously doesn't exist (no money in here).
- There's no "you forfeit, opponent gets the win" — they just keep playing without you.

---

## 4. Scoring Formula

File: `client/src/utils/index.ts:54-63`.

```ts
DEFAULT_WORLD_SCALE = 14917 // km, ~half earth circumference
MAX_SCORE = 5000
PERFECT_SCORE_THRESHOLD_KM = 0.025 // 25m

if (distance_km <= 0.025) return 5000
score = 5000 * exp(-10 * distance_km / scale)
return round(score)
```

- **Max points per round: 5000** (≤25m hit). Max per match (5 rounds): 25,000.
- Distance is **Haversine** with `R = 6371 km` (`utils/index.ts:37-49`). Same shape as geohub.
- **Score = `5000 * e^(-10·distance/14917)`** — slightly different from geohub's `5000 * e^(-distance/2000)`. The "-10/scale" form is mathematically equivalent to a steeper falloff: an off-by-1500km guess gets ~370 points here vs ~470 in geohub. The constants differ but the curve is the same family.

### Where scoring runs — **CLIENT-SIDE.**
- `calculateDistance` and `calculateScore` are imported into `SinglePlayerGamePage.vue`, `MultiplayerGamePage.vue`, and `DailyChallengeGamePage.vue` and run before any server write.
- The client then writes `{score, distance}` to Firebase RTDB at `/rooms/.../guesses/{userId}` directly — Firebase Security Rules would be the only thing standing between a tampered client and a 25,000-point write. **The repo contains no Security Rules file.** Default rules vary, but in any case, we'd be relying on rules to enforce something Firebase rules really aren't designed for (math validation against another field).

### Wagering risks in current scoring path
1. **Score is client-computed and client-written.** A user can write `{lat: bogus, lng: bogus, score: 5000, distance: 0}` to their own guess slot and the server's only defense is Firebase RTDB Security Rules — which can't easily verify the score formula given the inputs. **Fatal for wagering.** Must move scoring to a trusted server.
2. **Lat/lng of the answer leaks via Mapillary.** When the client calls `viewer.moveTo(imageId)`, Mapillary returns the pano's metadata including lat/lng (`StreetViewComponent.vue:72`: `const pos = await viewer.getPosition()`). A malicious client can intercept this response *before* the user clicks the map and snap a perfect guess. This is the **same class of leak as geohub**, just one network hop later. The image ID is not enough — Mapillary will reveal coordinates to anyone with the image ID and a token.
3. **Daily-score POST is unauthenticated against the user's actual round results.** `dailyScores/handler.py:16-25` accepts `{score, distance, time_taken}` from the client, validates only Pydantic types, and inserts. The server has no record of which images were shown or what the correct answers were, so it cannot verify the score. **Fatal for wagering.**
4. **The 4-digit roomId space is collision-prone.** `Math.floor(Math.random()*10000)` with no uniqueness check — at modest concurrency, two simultaneous hosts can collide and one gets silently overwritten or rejected. Tolerable for a casual public site, unacceptable for a wager match.
5. **Client-supplied `time_taken` is the same problem as geohub's `guessTime`.** Server stores it verbatim.

---

## 5. Multiplayer / Duels

### Result: **Real, working, N-player multiplayer exists.** This is the headline finding.

- Realtime transport: **Firebase Realtime Database** with `onValue` subscriptions and `onDisconnect` cleanup (`useMultiplayerRoom.ts:191-195, 186-188`).
- Round-state oracle: **Firebase Functions** in Python that listen to RTDB writes and gate state transitions (`functions/main.py:10-135`).
- Lobby UI: real lobby with player list, game config, host privileges (`LobbyComponent.vue`).
- Round logic: synchronized "everybody loaded the pano → start round; everybody guessed → end round / advance" (`functions/main.py:46-77, 105-135`).
- Disconnect handling: `onDisconnect` flips `isConnected = false`; the round-state oracle skips disconnected players from the everyone-guessed gate.

### How much of Geohustler's 1v1 + locked-room + 60s + forfeit it covers

| Geohustler requirement | Geoguess-Lite has it? | Detail |
|---|---|---|
| Locked-room two-player session | **~Yes** | Rooms are N-player but trivially restrictable to 2. Status gates joins (`useMultiplayerRoom.ts:220-222`). |
| Pre-game lobby with both players | **Yes** | `LobbyComponent.vue` |
| Server picks the locations | **Partial** | Lambda picks `imageId`s from server's image table. **But lat/lng is not on the server.** |
| Hide round N's location until round N starts | **No** | All 5 imageIds are written to RTDB at match-creation time. Client subscribed to the room reads them all. Mapillary then returns lat/lng on first pano load — so for any imageId the client has, lat/lng is one Mapillary fetch away. |
| Server-authoritative round timer | **No** | Timer is `performance.now()` on the client. |
| Round-end trigger | **Yes (event-driven)** | Firebase Function fires when all guesses are written; advances `currentRound`. Not deadline-based, only quorum-based. |
| Disconnect detection | **Yes** | `onDisconnect` + `isConnected` flag. |
| Forfeit on disconnect → opponent wins | **No** | A disconnect is silently treated as "skip them this round." No pot logic at all. |
| Atomic match creation + funds debit | **No** | No money concept anywhere. |
| Reconnection | **Partial** | RTDB subscription will catch the player back up to current state on `onValue`. There's no explicit "resume" endpoint. |
| Anti-double-submit | **Implicit** | RTDB write is idempotent on key `users/{userId}` — second write overwrites the first. Server doesn't reject. Within a single round this is fine; across rounds, same. |
| Idempotent match creation | **No** | Random 4-digit ID, no dedupe. |

### Net assessment for the multiplayer layer

**Roughly 50-60% of the 1v1 plumbing is done.** Lobby, room state, presence, round-end gating, disconnect detection — those are real and working. What's missing or wrong:

- Server-authoritative timer (must add).
- Drip-locations (must replumb so the server reveals one imageId at a time, after the round has started — and ideally caches the lat/lng server-side rather than relying on Mapillary's own response client-side).
- Server-validated scoring (must move to Lambda / Next.js API).
- Pot/payout logic (greenfield).
- Forfeit-on-disconnect → winner takes pot (greenfield).
- 2-player lock (trivial).

If we keep the Firebase RTDB transport, this is a **real shortcut** vs geohub. If we don't (because we're going Supabase Realtime to keep the stack consolidated), the value drops to "we have a reference architecture we can rebuild against Postgres + Supabase Realtime."

### A note on Firebase Functions as the round-state oracle

This pattern is **clever and dangerous in equal measure**. Clever because: a few lines of Python listening to two RTDB paths gives you real synchronized state. Dangerous because: the same architecture leaves *all writes* to the client. The server doesn't gate guesses, just reacts to them. For Geohustler, we'd want the inverse — the server gates the writes, the client reacts.

---

## 6. Map / Location System

### Where locations come from

- Single Postgres table on Neon: `images(id, is_pano)` — that is **literally all the schema** (see `server/src/images/repository.py:14-31` and `model.py:4-7`).
- The `id` is a Mapillary image ID. Mapillary owns the lat/lng, the imagery, and the metadata.
- Sampling: `ORDER BY RANDOM() LIMIT 5` (`images/repository.py:18-21`).
- A boolean flag separates panoramic from flat images — Mapillary has both.

### Map identity

There is no concept of a "map." There's just one global pool of Mapillary image IDs. Game config does have a `mapType: 'World'` field (`gameConfig.ts:10`) but the SelectItem in `GamePage.vue:84-87` lists exactly one option and the server doesn't read it.

### Restricting the pool for MVP

Trivial. We'd seed our own table with curated good-coverage Google panos (we're switching to Google anyway — see section 7). The geoguess-lite repo also doesn't ship the actual `images` table contents; we'd need to seed our own regardless.

The structure of a server table that holds only an image ID (and lets the imagery provider host the heavy bits) is **the right shape for us to copy**. Just we'd swap "Mapillary image ID" for "Google pano ID" and add the lat/lng / heading / pitch / zoom fields back into our own table so we don't have to round-trip through Google to know the answer.

---

## 7. Street View Integration

### **Surprise: it's NOT Google Street View. It's Mapillary.**

This is the most consequential single fact about the codebase relative to Geohustler.

| Component | Provider | File | Note |
|---|---|---|---|
| Pano viewer | Mapillary (`mapillary-js@4.1.2`) | `client/src/components/StreetViewComponent.vue:1-141` | `new Viewer({ container, accessToken, component: { pointer, sequence, direction, zoom } })` |
| Pano load | Mapillary | `StreetViewComponent.vue:65-90` | `viewer.moveTo(imageId)` then `viewer.getPosition()` returns `{lat, lng}` |
| Guess minimap | Mapbox (`mapbox-gl@3.18`) | `MapComponent.vue:1-229` | Renders Mapbox Streets v12 vector tiles; click handler emits guess lat/lng |
| Result map | Mapbox | same | Adds player markers + correct location marker, animates `flyTo` |

### Cost implications for Geohustler

- **Mapillary is free up to ~30k requests/mo** at last public pricing (it's owned by Meta and the tier shifts; check current). On a 5-round 1v1 match, that's 10 pano loads per match (one per player per round). 30k/mo = 3,000 matches/mo, ~100/day, free. **Massive cost win** vs Google.
- **Mapbox** is also free up to 50k tile-loads/mo and ~$0.50 per 1k after — vs Google Maps JS which is metered per session-load and ends up around $0.007/load.
- **But:** Mapillary's coverage is **dramatically worse** than Google Street View. The "diverse world" experience players actually want for a competitive guessing game is ~80% Google, ~20% Mapillary (rough public sentiment among GeoGuessr clones). For wagering specifically, players will flame us if obscure dirt roads in Estonia are 50% of the rounds.
- The CLAUDE.md instruction is "Maps: Google Street View, ignore TOS/cost." Following that, **we'd rip Mapillary entirely** and re-skin StreetView around Google's `StreetViewPanorama` (the geohub pattern). Mapbox can stay or get swapped — not a strong opinion.

### What's billed currently

- 1× Mapillary pano load per round (free tier).
- 1× Mapbox guess map render per round (free tier).
- 1× Mapbox result map render per round (free tier).
- Plus Firebase RTDB reads/writes per state change.

### Key handling

- Mapillary token: `import.meta.env.VITE_MAPILLARY_TOKEN` — public client token, ships in JS bundle.
- Mapbox token: `VITE_MAPBOX_TOKEN` — same.
- Both require URL-restriction lockdown in their respective dashboards. Same pattern as Google would be.

---

## 8. Auth + DB Schema

### Auth (current)

- **Firebase Authentication** with **Google sign-in only** (`useAuth.ts:11-17`: `signInWithPopup(auth, googleAuthProvider)`).
- VueFire integration: `useCurrentUser()`, `useFirebaseAuth()`, `useIsCurrentUserLoaded()` (`useAuth.ts:8-9`).
- Client gets Firebase ID token via `currentUser.getIdToken()` and sends it as `Authorization` header (`useApi.ts:8-15`).
- Server validates via `core/auth.py` — this is a Lambda Authorizer that calls `firebase_admin.auth.verify_id_token(token)` and returns an IAM policy (`server/src/core/auth.py:14-48`).
- `event.requestContext.authorizer.uid` carries the verified Firebase UID into downstream Lambdas.

### "Guest mode"

- Client treats `isCurrentUserLoaded && !currentUser` as guest (`GamePage.vue:528`).
- Single-player mode is allowed for guests; multiplayer + daily-challenge require Google sign-in (`router/index.ts:26, 33` `requiresAuth: true`; `GamePage.vue:544-549` `isGameModeAvailable`).

### For Geohustler

- Rip the entire Firebase Auth dependency — replace with Supabase auth.
- We probably still want Google OAuth + Discord OAuth (gambling demographic likes Discord).
- The Lambda Authorizer pattern is irrelevant if we go Next.js — we'd use `@supabase/auth-helpers-nextjs` and read sessions from cookies in API routes.

### Database — TWO databases

#### Postgres (Neon) — application state

| Table | Source-of-truth | Notes |
|---|---|---|
| `users` | `server/src/users/model.py:5-15` + `repository.py` | Auth profile + aggregate stats |
| `images` | `server/src/images/model.py:4-7` | Mapillary image pool |
| `daily_challenges` | `dailyChallenges/model.py:5-7` | Date keyed |
| `daily_challenge_rounds` | `dailyChallenges/model.py:10-14` | 5 image IDs per challenge |
| `daily_scores` | `dailyScores/model.py:5-11` | Per-user-per-day score; basis of leaderboard |

#### Firebase Realtime Database — transient multiplayer state

| Path | Shape |
|---|---|
| `/rooms/{roomId}` | `RoomNode` from `client/src/types/index.ts:64-73` |
| `/rooms/{roomId}/players/{userId}` | `PlayerNode` from `types/index.ts:35-43` |
| `/rooms/{roomId}/rounds/{roundNum}` | `RoundNode` from `types/index.ts:45-48` (`{imageId, guesses}`) |
| `/rooms/{roomId}/rounds/{roundNum}/guesses/{userId}` | `GuessNode` from `types/index.ts:50-55` (`{lat, lng, score, distance}`) |
| `/rooms/{roomId}/roundState/{roundNum}` | `RoundStateNode` from `types/index.ts:57-60` (`{hasEveryoneLoaded, hasEveryoneGuessed}`) |

### Field-level (the ones that matter)

#### `users` (Postgres — `server/src/users/model.py`)
| Field | Type | Notes for Geohustler |
|---|---|---|
| `id` | string (Firebase UID) | → use Supabase `auth.users.id` |
| `name` | string | Display name (set from Google profile) |
| `avatar_emoji` | string | Cosmetic |
| `avatar_bg` | string (color name) | Cosmetic |
| `games_played` | int | Aggregate |
| `best_score` | int | Aggregate |
| `average_score` | float | Aggregate |
| `distance_unit` | `'km' \| 'mile'` | UX prefs |

Notably **no email** stored; Firebase owns that. Notably no role/admin/ban flag.

#### `images` (Postgres)
| Field | Type | Notes |
|---|---|---|
| `id` | string (Mapillary image ID) | |
| `is_pano` | bool | |

That's it. **No lat/lng, no country, no curation metadata.** For Geohustler we'd add `lat, lng, pano_id, heading, pitch, zoom, country_code, difficulty, last_validated_at`.

#### `daily_challenges`, `daily_challenge_rounds`, `daily_scores`
Cut for MVP.

#### `RoomNode` (RTDB)
| Field | Type | Notes |
|---|---|---|
| `id` | string (4-digit) | |
| `config` | `{mapType, timeLimit, allowMoving, allowZooming, onlyPanorama}` | |
| `players` | `Record<userId, PlayerNode>` | |
| `rounds` | `Record<roundNum, RoundNode>` | **All 5 imageIds written at start.** |
| `roundState` | `Record<roundNum, RoundStateNode>` | Server-set (Firebase Function) |
| `currentRound` | int | |
| `status` | `'waiting' \| 'loading' \| 'loaded' \| 'playing' \| 'finished' \| 'error'` | |
| `createdAt` | int (ms epoch) | |

### Proposed Geohustler Postgres schema

Same as the geohub teardown's proposal. The notable change is that geoguess-lite's `images` table being empty of coords makes this *easier*, not harder — we curate fresh coords ourselves, on Google panos.

```
locations(id uuid pk, lat numeric, lng numeric, pano_id text, heading numeric, pitch numeric, zoom numeric, country_code text);
matches(id uuid, player_a, player_b, wager_cents, pot_cents, rake_cents, state, current_round, round_started_at, winner_id, ...);
match_rounds(match_id, round_no, location_id, unique(match_id, round_no));
match_guesses(match_id, player_id, round_no, lat, lng, distance_km, points, time_ms, submitted_at, primary key(match_id, player_id, round_no));
wallets, ledger_entries, deposits, withdrawals — port from hard2kill.
```

---

## 9. Frontend File Map

### Pages (`client/src/pages/`)

| File | Purpose | Core loop? |
|---|---|---|
| `LandingPage.vue` | Marketing landing | Cut — Geohustler has its own |
| `GamePage.vue` | Lobby + mode-picker + profile + leaderboard (one mega-page, ~700 lines) | **Adapt** — strip to "Find Match" |
| **`MultiplayerGamePage.vue`** | Active multiplayer game (~600 lines) | **Core — adapt heavily for 1v1 + server-driven timer** |
| `SinglePlayerGamePage.vue` | Solo game | Cut |
| `DailyChallengeGamePage.vue` | Daily challenge | Cut |

### Components (`client/src/components/`)

| Component | Purpose | Core loop? |
|---|---|---|
| **`StreetViewComponent.vue`** | Mapillary viewer wrapper | **Rip and rebuild against Google Street View** (it's 140 lines; rewrite is faster than adaptation) |
| **`MapComponent.vue`** | Mapbox guess + result map | **Adapt** — either swap to Google Maps JS for parity, or keep Mapbox |
| **`LobbyComponent.vue`** | Pre-game lobby | **Adapt** — strip host-config (settings are locked in Geohustler) |
| `GameSummaryMultiplayerComponent.vue` | End-of-match breakdown | Adapt — show winner + payout |
| `GameSummarySinglePlayerComponent.vue` | Solo summary | Cut |
| `SummaryCardComponent.vue` | Per-round card | Adapt |
| `HeaderComponent.vue`, `FooterComponent.vue` | Layout | Adapt |
| `CustomCardComponent.vue`, `CustomCheckboxComponent.vue`, `CustomSliderComponent.vue` | Settings UI | Cut (settings locked) |
| `components/ui/*` | shadcn-style primitives (button, card, input, select, slider, spinner, accordion, separator, progress, item, checkbox) | Keep |

### Composables (`client/src/composables/`)

| File | Purpose | Verdict |
|---|---|---|
| **`useMultiplayerRoom.ts`** (361 lines) | Firebase RTDB room CRUD + subscriptions + onDisconnect | **Adapt** — port the architectural pattern to Supabase Realtime, OR keep RTDB and rewire score validation server-side |
| **`useTimer.ts`** | Client-side requestAnimationFrame timer | Adapt — drive from server `round_started_at` |
| `useApi.ts` | Authed fetch wrapper for OpenAPI client | Replace with our own fetch helper |
| `usePublicApi.ts` | Public API (key-based) wrapper | Replace |
| `useAuth.ts` | VueFire Google auth | **Rip** — replace with Supabase |
| `useUserQuery.ts` | TanStack Query around `/users/me` | Adapt for Supabase profile |
| `useDailyScoreQuery.ts`, `useDailyChallengeQuery.ts` | Daily challenge | Cut |
| `useImagesQuery.ts` | Get random images for single-player | Cut (replaced by match flow) |
| `useMultiplayerRoundsApi.ts` | Wrapper around POST /multiplayer-rounds | Adapt |

### Stores (`client/src/stores/`)

`gameConfig.ts` — single Pinia store for lobby config. Keep / trim.

### Services (`client/src/services/`)

Generated OpenAPI client. ~50 files. **Regenerate from a fresh OpenAPI yml** that matches Geohustler's API or replace with hand-written fetch (probably the latter — the OpenAPI generator output is verbose and is overkill for ~6 endpoints).

### Server-side (cut entirely or rewrite in TS)

All of `server/` is Python Lambdas. If we're standardizing on Next.js + Supabase, **we're rewriting all of this in TypeScript** as Next API routes. The valuable thing to port is the **architecture** (handler / service / repository / model split), not the code.

`functions/main.py` — the Firebase Functions logic — has direct analogs in any Postgres-backed approach. If we keep RTDB, port verbatim. If we go Supabase Realtime, the round-end logic becomes a Postgres function or an API route called by the second player's guess.

---

## 10. Keep / Adapt / Rip / Rebuild Inventory

### KEEP (use as-is or near-as-is)

| Item | Path |
|---|---|
| Distance formula (Haversine) | `client/src/utils/index.ts:37-49` — same as geohub |
| Score formula (constants differ; pick one) | `client/src/utils/index.ts:54-63` |
| Map zoom helper | `client/src/utils/index.ts:74-92` |
| Distance formatter | `client/src/utils/index.ts:15-35` |
| shadcn-style UI primitives | `client/src/components/ui/*` |
| Per-feature server architecture pattern | `server/src/{feature}/{handler,service,repository,model}.py` |
| Pre-game lobby UI shape | `client/src/components/LobbyComponent.vue` |
| `useTimer` composable structure (drive from server timestamp) | `client/src/composables/useTimer.ts` |
| Match summary card layout | `client/src/components/GameSummaryMultiplayerComponent.vue` |
| Marker / map flyTo / zoom animation | `client/src/components/MapComponent.vue:110-125` |

### ADAPT (port logic, swap data layer / multiplayer-aware)

| Item | What to change |
|---|---|
| `useMultiplayerRoom.ts` | Either rewire to Supabase Realtime (channels per match) or strip to 2-player and keep RTDB. Lose `createRoom` (matches are matchmaker-spawned, not user-spawned). |
| `MultiplayerGamePage.vue` | Drop host privileges. Drive timer from server `round_started_at`. Reject client-computed score. |
| `MapComponent.vue` | Probably swap to Google Maps JS for cost parity with the pano provider; or keep Mapbox if we're OK with two providers. |
| `multiplayerRounds/service.py` | Port to TS (Next API). Add: server-stamps `round_started_at` on round 1. Drip locations: write only round 1's imageId to client; reveal subsequent rounds only after previous round's guesses are settled. |
| `functions/main.py` | The whole round-end gating logic becomes a server-side handler invoked by the guess submission API. Trigger architecture stays similar. |
| `users/service.py` | Replace Firebase UID with Supabase user id. Drop `has_played_daily_challenge` field. |

### RIP (delete entirely)

| Surface | Reason |
|---|---|
| Firebase Auth + VueFire (`useAuth.ts`, `lib/firebase.ts:3,19`, `core/auth.py`, `core/firebase.py`) | Replace with Supabase auth |
| Firebase Authentication module from server | Same |
| **Mapillary integration** (`StreetViewComponent.vue` Viewer code, `mapillary-js` dep, `VITE_MAPILLARY_TOKEN`, `mapillary_token` in secrets) | Switch to Google Street View |
| **Daily challenge** entire vertical (`pages/DailyChallengeGamePage.vue`, `server/src/dailyChallenges/*`, `server/src/dailyScores/*`, `scheduled/daily_challenge_*.py`, `useDailyChallengeQuery.ts`, `useDailyScoreQuery.ts`) | Out of MVP scope |
| Single-player mode (`pages/SinglePlayerGamePage.vue`, `useImagesQuery.ts`, public API gateway entirely) | We're 1v1 only |
| Profile editing UI (emoji picker, avatar bg picker) | Out of MVP scope |
| Leaderboard UI on `GamePage.vue:387-429` | Out of MVP scope |
| Account deletion flow | Optional, deferred |
| AWS SAM template + LocalStack + sam-build pipeline | Replaced by Next.js / Vercel / Supabase deploy story |
| OpenAPI generated TS client (`client/src/services/`) | Hand-written fetch is simpler at this scale |
| Playwright e2e test scaffolding | Optional |

### REBUILD FROM SCRATCH (greenfield)

| Module | Why |
|---|---|
| **Matchmaker / queue** | No matchmaking concept here either. Lobbies are user-created, not paired. |
| **Server-authoritative round timer** | Stamp `round_started_at` on each round transition. Reject submissions past `round_started_at + 60s`. |
| **Server-validated scoring** | All distance + score math runs server-side. Client never writes `score`. |
| **Server-private locations / drip-feed** | Reveal one image_id at a time AFTER the round has started. Server holds lat/lng so we never have to round-trip Mapillary or Google for the answer. |
| **Wager pot + payout transactions** | No money concept in either repo. Port from hard2kill. |
| **Bonus balance + WR** | Same. |
| **Stripe deposits / withdrawals** | Same. |
| **Forfeit-on-disconnect → opponent wins pot** | Geoguess-lite drops a disconnected player from the round-end gate but doesn't end the match. We need the opposite. |
| **Anti-double-spend / idempotent guess** | Per `(match_id, player_id, round_no)` unique constraint; server rejects subsequent. |
| **Reconnection / resume** | Server returns full state + remaining-time on `/match/[id]/state`. |

---

## 11. Risks & Surprises

1. **Locations leak via the imagery provider, not via the API payload.** This is more subtle than geohub but the same outcome: the client knows the answer before the user clicks. Specifically: server sends `imageId`; client calls Mapillary's `viewer.moveTo(imageId)`; Mapillary's response includes lat/lng. Network tab reveals it. **For Geohustler with Google Street View, the equivalent is `StreetViewService.getPanorama({location})` — which we control, since we provide the `location`.** As long as we send only `panoId` (not lat/lng) to the client, and as long as the pano metadata returned by Google doesn't leak lat/lng (it does — `data.location.latLng`), we have the same problem with Google. **The fix is the same for both: don't render the result map until after the guess is submitted, and accept that a determined cheater can read pano coords from the SDK.** Anti-cheat is out of MVP scope per the brief, so this is informational.

2. **Score is client-computed and client-written to a writable RTDB path.** The most expensive single fix. Either: (a) keep RTDB for transport but route all score writes through a Lambda/Next API that recomputes from `(match_id, round_no, lat, lng)` server-side, or (b) move multiplayer transport to Supabase Realtime backed by Postgres rows that only the server can write. Recommend (b) for the wager case — it's simpler than fighting RTDB security rules.

3. **Three-cloud architecture (AWS Lambda + Firebase + Neon).** The current stack spans AWS, Firebase, and Neon. For an MVP wagering platform we want one cloud surface. **Whatever we keep from this codebase, the deploy story is going to be rewritten on Vercel + Supabase.** Plan that in.

4. **Mapillary vs Google.** Already covered. The codebase is built around Mapillary as a first-class assumption (the entire `StreetViewComponent.vue` is Mapillary-Viewer-specific). We rip and rewrite. **Estimate: ~1 day to swap in Google Maps JS Street View** (the geohub `StreetView.tsx` is a useful reference — copy it, port to Vue 3 `<script setup>`).

5. **Vue 3 vs Next.js / React.** This codebase is **Vue, not React**. CLAUDE-Md says "Next.js or whatever the OSS uses." If we adopt geoguess-lite as the base, we're committing to Vue 3 + Vite + Pinia + VueFire (which we'd swap). If we want React for hard2kill alignment, geohub is a closer code-level fit, but lower-quality multiplayer (none). Frontend rewrite cost from Vue → React is real but not catastrophic for a ~10-page app.

6. **Mapbox tokens are public.** Same risk as the geohub Google key — `VITE_*` env vars are inlined into the bundle. Lock down with URL referer restrictions in Mapbox dashboard.

7. **4-digit room IDs collide.** Bare `Math.random()*10000`. Fine for a hobby site, broken under wagering load. We'd use UUIDs and let matchmaker generate them.

8. **No rate limiting on most endpoints.** Server's `template.yaml:48-65` puts a usage plan on the `/images` public endpoint (5 rps / 20 burst) but the Firebase-authed endpoints are unlimited. For wagering, add rate limits everywhere.

9. **Daily-challenge is a parallel codepath we don't need but it's woven into the user model.** `users.service.build_get_user_response` calls `has_user_played_today` (`server/src/users/service.py:11-26`) on every user fetch. Rip the daily stuff, the dependency vanishes.

10. **The Firebase Functions model has a state-progression bug.** `on_round_guesses_updated` reads `connected_players_count` at function-fire time. If a player's `isConnected` changed within the same RTDB transaction window, the count can be stale. For a 1v1 wager match we'd want exactly-once round-end semantics — which means moving this to a server-side transaction over Postgres rows. (Functionally not broken for a casual game, but not robust enough for money.)

11. **`onDisconnect` is set in two different places asymmetrically.** `createRoom` sets it on the host; `joinRoom` sets it on the joiner; `getRoomById` sets it again on revisit. There's a chance of layered handlers. Audit before relying on it for forfeit logic.

12. **Tests are real but minimal.** `server/tests/` has a `conftest.py` and per-feature directories. Better than geohub's stub tests, but still not enough to safety-net a money-handling refactor. Plan unit tests around scoring + matchmaker + ledger before going live.

13. **No CSRF / no API rate limiting on the multiplayer-rounds POST.** A signed-in user can spam-create rounds for any roomId they know. Cheap denial-of-game-progress vector.

14. **The `LandingPage.vue` is 8KB and the `GamePage.vue` is 26KB** — big monolithic Vue files. If we adopt the codebase, expect to spend a half-day decomposing those into smaller composables before they're maintainable.

15. **Pinia store is essentially empty** (only `gameConfig` ref state). Compared to geohub's heavy Redux usage with `redux-persist`, this is a relief — far less to rip out.

---

## Quick file lookup index (high-impact files)

- Score formula: `client/src/utils/index.ts:54-63`
- Distance formula: `client/src/utils/index.ts:37-49`
- Multiplayer composable: `client/src/composables/useMultiplayerRoom.ts:1-360`
- Active multiplayer page: `client/src/pages/MultiplayerGamePage.vue:1-611`
- Pre-game lobby: `client/src/components/LobbyComponent.vue:1-164`
- Mapillary viewer wrapper: `client/src/components/StreetViewComponent.vue:1-141`
- Mapbox map wrapper: `client/src/components/MapComponent.vue:1-229`
- Round-creation Lambda: `server/src/multiplayerRounds/service.py:8-57`
- Image pool sampling: `server/src/images/repository.py:6-46`
- Firebase Functions oracle: `functions/main.py:1-175`
- Firebase Authorizer Lambda: `server/src/core/auth.py:1-66`
- Postgres connection: `server/src/core/db.py:1-12`
- SAM infra: `server/template.yaml:1-303`
- Router: `client/src/router/index.ts:1-52`
- Auth composable: `client/src/composables/useAuth.ts:1-35`
- User table schema: `server/src/users/model.py:5-15`
- Image table schema: `server/src/images/model.py:4-7`
- Room state types: `client/src/types/index.ts:35-103`
- Constants (rounds, max score, scale): `client/src/consts/index.ts:21-28`
