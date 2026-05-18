# CS 1.6 Browser Wagering — Changelog

## April 16, 2026

### Research & Planning
- Created project folder at `engineering/cs16-wagering/`
- Wrote GOAL.md — project definition, success criteria, why this approach
- Wrote PLAN.md — 4-phase implementation plan with timelines and exit criteria
- Wrote WIKI.md — technical verification of 12 claims with online sources
  - 8 claims VERIFIED (engine works, npm package exists, Docker server works, HD textures supported, custom maps via J.A.C.K., sound replacement, AMX Mod X compatible, cs16-client is open-source)
  - 4 claims PARTIALLY VERIFIED (player model conversion needs re-rigging, HUD sprites need code changes or HTML overlay, WebGL2 post-processing theoretically possible but unproven on this engine, free CC0 assets exist but need format conversion)
  - 0 claims FALSE
  - 0 deal-breakers found
- Identified three key risks: GPL license separation, visual ceiling (HD retro not modern), asset replacement effort
- Overall verdict: CONDITIONAL GO — proceed with Phase 0 proof of concept

### Key decisions made
- Project will produce "HD retro" visuals (better than stock CS 1.6, not CS:GO-level)
- All Valve assets will be replaced before any commercial use
- Wagering logic will be architecturally separated from the GPL engine (separate backend service)
- AMX Mod X plugin will bridge game server → wagering API
- Phase 0 (proof of concept) must pass before committing to asset pipeline

---

## April 16, 2026 — Phase 0 Complete

### Phase 0 — PASSED
- Cloned webxash3d-fwgs to `/game/cs16-wagering/`
- Downloaded CS 1.6 assets via SteamCMD (app 90, forced Linux platform)
- Built valve.zip (415MB) from valve/ + cstrike/ directories
- Ran `react-typescript-cs16` example — CS 1.6 loads and runs in browser
- Added loading UI with status indicators, map selector buttons, crosshair overlay
- Tested de_dust2 — map loads, movement works, shooting works, rendering clean
- Bot AI not in cs16-client WASM build (expected — multiplayer uses Docker server)
- 25 maps available including dust2, inferno, nuke, train, office, italy, aztec

### Key decision: SKIP ASSET REPLACEMENT
- Stefan: "it's perfect as it is, let's focus on core functionalities of introducing wagering"
- Dropping Phase 1 (asset replacement) from immediate plan
- Going straight to wagering integration
- Asset replacement becomes optional future work if Valve IP becomes an issue
- New priority order: Docker multiplayer → match tracking → wagering flow

---

## April 17, 2026

### Step 1 — COMPLETE: Multiplayer CS 1.6 server running
- Attempted Railway deployment — blocked by 413 Payload Too Large (valve.zip is 415MB)
- Built multi-stage Dockerfile that downloads CS files via SteamCMD during build
- Attempted Fly.io deployment — server crashed: `listen udp` panic on IPv6 link-local bind (Fly.io firecracker VM limitation)
- Deployed to DigitalOcean droplet ($6/month, NYC1, 1 vCPU, 1GB RAM)
  - IP: 161.35.99.157
  - Docker image: yohimik/cs-web-server-metpamx:latest
  - Game server on port 27016 (HTTP) + 27018 (UDP/WebRTC)
  - Map: de_dust2, 4 player slots
  - AMX Mod X loaded and working
- Confirmed: two browser tabs connect, both players visible, can shoot each other
- **Multiplayer CS 1.6 in the browser is WORKING**

### Key learnings
- Railway can't do UDP (HTTP proxy only)
- Fly.io can't bind UDP to IPv6 link-local interfaces in firecracker VMs
- Simple VPS (DigitalOcean) just works — full port control, no restrictions
- The Docker image is ~500MB, valve.zip is ~415MB, total server footprint ~1.5GB

---

## April 18, 2026

### Custom UI overlay working
- `cs16-wagering/cs16-server/index.html` — HTML/CSS overlay on top of Xash3D canvas, polls `/h2k_state.json` every 500ms
- `h2k_deathmatch.sma` — AMX plugin writes JSON state file every 1s + on kill/connect events, served via symlink into `/xashds/public/`
- Overlay renders: branded start screen, kills/balance scoreboard, countdown+GO! announcements, killfeed (+$/-$), urgent timer, YOU WIN/LOSE end screens

### Verified 3 of 5 Phase A unknowns (Apr 20)
- **HTTPS on droplet:** no Caddy/nginx yet, real blocker — added to plan as Phase A0 with 30-min Caddy+DNS setup
- **cURL module in metpamx image:** confirmed NOT installed (Dockerfile only installs base AMX 1.9.0 + cstrike). Redesigned: plugin appends to `h2k_events.jsonl`, Go/Node sidecar tails & POSTs with HMAC. Plugin stays pure file I/O.
- **Token passing:** no query-param hook exists; Xash3D WASM client runs locally. Correct path via `Cmd_ExecuteString('setinfo token …')` from React wrapper, plugin reads with `get_user_info()`. Standard AMX, version-agnostic.
- Decisions #4 (webhook secret location) and #5 (single-server Phase A) are design choices, resolved as planned.
- New decision #6 added: sidecar as Node container (recommended) vs extending the Go engine binary.

### Client bundle rebuild path (Apr 21)
- Confirmed via Chrome devtools: the live `fps.hard2kill.me` bundle does NOT expose the engine on any `window.*` global (engine/xash3d/xash/Xash3D all undefined). Bundle rebuild required to plumb URL-param tokens into `setinfo`.
- Located the bundle source at `cs16-wagering/docker/cs-web-server/src/client/main.ts` — vanilla TS (not React), uses Vite.
- **Modified** `main.ts`:
  - Parses `?token=` / `?matchId=` from `window.location.search`, runs `setinfo token …; setinfo matchid …` after `x.main()` and before the existing `connect` command
  - Exposes `window.engine = x` for debugging + as a fallback hook for future overlay integration
  - Auto-submits the name form if `?name=&token=` are both present (skips the manual name entry on paid matches)
- **New** `cs16-server/scripts/build-client.sh` — runs `npm install && npm run build` in `docker/cs-web-server/`, copies `dist/` to `cs16-server/client-dist/` for the Docker build to pick up.
- **Updated** `cs16-server/Dockerfile` — adds `COPY client-dist/ /xashds/public/` which overrides the baked-in bundle with our H2K-aware build.
- **Phase A scope decision:** shipping WITHOUT the custom H2K overlay (scoreboard/killfeed/announcements from `cs16-server/index.html`). Vanilla upstream UI during play; the wagering loop closes end-to-end without it. Overlay re-integration is a follow-up (requires a build step that patches new asset hashes into the custom HTML).

**Droplet deploy now is:**
1. `./scripts/build-client.sh` (builds the bundle, stages to `client-dist/`)
2. `./scripts/gen-secret.sh --write .env`, mirror secret into hard2kill backend `.env`
3. Add `H2K_WEBHOOK_URL=https://h2k.app/api/cs16/match-result` to `.env`
4. `docker compose up -d --build`

### Refactor: drop iframe, use full redirect (Apr 20)
- **Design change:** iframe approach scrapped in favor of full-page redirect to `fps.hard2kill.me/?token=…`. Trade-off: lose H2K win modal (shown by CS overlay instead), gain massive simplicity and eliminate the postMessage handshake race.
- **Deleted** `platform/src/screens/CS16/CS16.tsx` + `/cs16` route + `CS16GameRoom.ts` (no longer need a client-side Colyseus game room).
- **Refactored** `matchEvents.ts`: now owns the full match lifecycle. `registerAndDebitMatch()` deducts both players' balances at pair-time and starts the safety timer; `resolveMatch()` credits the winner + logs to `game_history`; internal `refundMatch()` fires if safety timer expires.
- **Refactored** `CS16MatchmakingRoom.ts`: deducts bets + registers match IMMEDIATELY on pair (not deferred to a game room). Sends `matchmaking:found` with token + `serverHost` + `serverConnect` for the redirect URL.
- `Landing.tsx` `handleCS16Matchmaking`: on `matchmaking:found`, does `window.location.href = 'https://fps.hard2kill.me/?matchId=…&token=…&name=…&connect=…'`.
- `cs16-server/index.html`: replaced postMessage listener with URL-param parser. If URL has `?token=`, auto-fills the name, auto-submits the boot form, polls for the engine object, calls `Cmd_ExecuteString(setinfo token/matchid; connect …)`. "HARD2KILL" brand in overlay is now a `← HARD2KILL` link back to `h2k.app`.
- `index.ts`: webhook route now calls `resolveMatch()` directly instead of emitting to an event bus.

### Phase A frontend shipped (Apr 20)
- `platform/src/screens/Landing/Landing.tsx` — added CS 1.6 state hooks, `handleCS16Matchmaking()` (copies Wasteland pattern, plumbs token + serverHost + serverConnect through URL params), and a new game card rendered **first** in the grid (per single-game CSGO focus). Card previews live via iframe of `fps.hard2kill.me` with `pointer-events: none` so scrolling works.
- `platform/src/screens/CS16/CS16.tsx` — new screen. Loads `https://fps.hard2kill.me/` in iframe, joins the `cs16` Colyseus room with `{matchId, token}`, listens for `match:error` and `matchEnd`. Decodes userId from the signed token payload to render YOU WIN / YOU LOSE modal accurately. Small HUD with player names + pot + exit button.
- `platform/src/App.tsx` — registered `/cs16` route.
- `cs16-wagering/cs16-server/index.html` — added postMessage bridge. When embedded, posts `h2k:ready` to parent on load; on receiving `h2k:connect`, pre-fills name, submits form (triggers existing engine boot), then polls for `window.engine/xash3d` and calls `Cmd_ExecuteString('setinfo token …; matchid …; h2k_user …')` + `connect …` once the engine is live.

**Known gap — needs verification on deploy:** the current prebuilt `main-Sj92UznW.js` bundle may or may not expose the engine on a `window.*` global. If not, `Cmd_ExecuteString` calls fail silently and the token never reaches the plugin → backend safety timer refunds every match. **Fix if needed:** rebuild the React wrapper (based on `examples/react-typescript-cs16/src/App.tsx` which has direct `engineRef.current.Cmd_ExecuteString`) so it listens for `h2k:connect` and calls setinfo + connect directly. ~1 hour of work if required.

### Deployment automation (Apr 20)
- **`Dockerfile`** now compiles `h2k_deathmatch.sma` → `h2k_deathmatch.amxx` at image build time, using `amxxpc` already shipped inside the `yohimik/cs-web-server-metpamx` base image (from the amxmodx-base-linux-gcc tarball). No local Pawn compiler needed.
- Dockerfile also bakes both symlinks (`h2k_state.json`, `h2k_events.jsonl`) from `data/` → `public/` so the overlay and sidecar can fetch via HTTP. No manual `ln -sf` on droplet.
- Dockerfile appends `h2k_deathmatch.amxx` to `plugins.ini` so AMX auto-loads it on start.
- **Sidecar architecture flip** (same day): switched from shared-volume file tail to HTTP Range fetch (`GET http://cs16:27016/h2k_events.jsonl` with `Range: bytes=N-`). Cleaner: no cross-container filesystem plumbing, relies on the existing Go HTTP server already built into `cs-web-server`. Handles 206 Partial, 200 full-body fallback, 404 (file not yet created), 416 (truncation — resets offset).
- `docker-compose.yml` simplified accordingly — only a state volume for sidecar offset/seen-set persistence.
- `.env.example` + `scripts/gen-secret.sh` (64-char hex via openssl) — Stefan runs `./scripts/gen-secret.sh --write .env` on droplet, mirrors same secret into hard2kill backend `.env`.

**Droplet deploy now reduces to:**
1. `git pull`
2. `./scripts/gen-secret.sh --write .env`
3. Add `H2K_WEBHOOK_URL=https://h2k.app/api/cs16/match-result` to `.env`
4. Mirror `CS16_WEBHOOK_SECRET` into hard2kill backend `.env`
5. `docker compose up -d --build`

### Phase A plugin + sidecar shipped (Apr 20)
- `cs16-wagering/cs16-server/h2k_deathmatch.sma` v3.1:
  - New per-slot `g_token[33][192]` populated from `get_user_info(id, "token", …)` on `client_putinserver`
  - New shared `g_matchId[64]` captured from the first joining player's `setinfo matchid`
  - New `append_match_end_event()` appends one JSON line per match to `h2k_events.jsonl`. Payload: `{type, time, matchId, reason, winner:{slot,name,kills,token}, loser:{…}}`
  - Instrumented call sites: `event_death()` (killlimit), `end_match_by_time()` (timelimit/draw — new 2nd-place detection), `client_disconnected()` (forfeit). `reset_match` clears tokens+matchId
  - Plugin is pure file I/O, zero HTTP calls, zero HMAC (tokens pass through opaque)
- New `cs16-wagering/cs16-server/sidecar/` — Node 20 container:
  - Tails `h2k_events.jsonl` via polling (500ms) + byte-offset persistence in `state/events.offset` to survive restarts
  - Verifies both winner and loser token HMACs with `CS16_WEBHOOK_SECRET`, cross-checks token matchId matches event matchId
  - POSTs `{matchId, winnerId, loserId, winnerKills, loserKills, reason}` to `H2K_WEBHOOK_URL` with `X-H2K-Signature` header
  - Exponential backoff retry (1s, 4s, 16s), then gives up — backend's 10-min safety timer catches it
  - Handles draws + double-disconnects by forwarding null winner/loser so backend refunds
  - Truncation detection (resets offset if file shrinks, e.g. rotation)
  - Zero npm deps — pure Node built-ins (fetch, crypto, fs)
- `docker-compose.yml` — added `sidecar` service, named volumes `h2k_public` + `h2k_state` shared between cs16 and sidecar
- Droplet deployment steps required:
  1. `ln -sf /xashds/cstrike/addons/amxmodx/data/h2k_events.jsonl /xashds/public/h2k_events.jsonl` (matches existing h2k_state.json symlink pattern)
  2. Compile `.sma` → `.amxx` via `amxxpc`, upload to `cstrike/addons/amxmodx/plugins/`
  3. Set env `H2K_WEBHOOK_URL=https://h2k.app/api/cs16/match-result` and `CS16_WEBHOOK_SECRET=<shared-secret>` on droplet
  4. `docker-compose up -d sidecar`

### Phase A server-side scaffolding shipped (Apr 20)
- Extended `shared/supabase.ts` — `GameName` type now includes `'cs16'`
- New `server/src/cs16/tokens.ts` — HMAC-SHA256 match token mint/verify + webhook signature verify (zero new deps, uses Node crypto)
- New `server/src/cs16/matchEvents.ts` — shared EventEmitter + in-memory `activeMatches` registry (bridges Express webhook → Colyseus room)
- New `server/src/rooms/CS16MatchmakingRoom.ts` — queue by (bet, currency), pair players, mint HMAC tokens, return `{matchId, token, serverHost, serverConnect}`. No bot matching (CS Docker has no bots).
- New `server/src/rooms/CS16GameRoom.ts` — thin proxy: deduct bet on join, listen for `match-result` event from webhook, credit winner + log to `game_history`, 10-min safety timer refunds both if no result
- `server/src/index.ts` — registered `cs16` + `cs16-matchmaking` rooms, added `POST /api/cs16/match-result` webhook route (HMAC-verified, validates winner/loser belong to match, emits to event bus)
- Type-check clean on all new files. Existing errors are pre-existing (decorators, JSON imports) and don't affect runtime under `ts-node --transpile-only`.

### INTEGRATION_PLAN.md written
- Mapped hard2kill monorepo: platform/ (React) + server/ (Colyseus) + shared/supabase.ts
- Identified integration pattern: copy Wasteland (iframe + matchmaking room) to minimize risk
- 4-phase plan: A) MVP integration (3-5d), B) bonus balance (2-3d), C) multi-tenant pool (3-5d), D) primary game pivot (1w)
- Key design: AMX plugin POSTs match result to H2K webhook (HMAC-signed), polling is heartbeat fallback
- 5 decisions flagged: webhook secret mgmt, iframe HTTPS (mixed-content blocker), cURL module availability, token in query param vs player name, single-server Phase A tolerance
- Phase A ships ~8 working days to real-money CS 1.6 (A+B back-to-back, Phase B gates cash bets to prevent T-001 exploit reoccurrence)

---

## April 22, 2026 — RESET

Stefan pulled scope back to the minimum viable bar: `fps.hard2kill.me` loads → assets auto-download → JOIN enables → one click → spawn in team deathmatch on de_dust2. Wagering parked, not deleted.

### What changed from the April 21 plan
- **Goal collapsed to "can a visitor play?"** All wagering work (tokens, HMAC, webhooks, matchmaking rooms, sidecar, match-result webhook) paused. Nothing deleted — all parked in git to re-add cleanly in Phase 5+.
- **One codebase.** `cs16-wagering/` folds into `hard2kill/cs16/`. Old location archived as `cs16-wagering.archive/`. Stefan: "don't work two codebases, just one".
- **Rules: team deathmatch, no bomb defusal.** CS team-select stays (engine's native menu). Primary path: CSDM plugin. Fallback: strip `h2k_deathmatch.sma` to TDM.
- **Boot UX.** Downloads start on page load — JOIN button is disabled during download, flips to enabled at 100%, click triggers engine boot + connect. No wagering URL params.
- **In-match UI.** Vanilla engine HUD during play. Branded HARD2KILL boot screen hides after first rendered frame. Money-denominated overlay (balance, +$/-$ killfeed, YOU WIN/LOSE modal) parked.
- **Asset budget.** Target 60-80 MB via a `valve-dust2.v1.zip` stripped to de_dust2 + all 8 player models + all weapons + required sprites/sounds. Down from stock 415 MB.

### New 5-phase plan (see `ROADMAP.md`)
- Phase 0: Consolidate `cs16-wagering/` → `hard2kill/cs16/`. Drop wagering plugin + sidecar. Install CSDM for TDM.
- Phase 1: Branded `main.ts` + `index.html` rewrite. Auto-download on load. JOIN enables at 100%. One-click connect.
- Phase 2: Slim `valve.zip` to dust2-only.
- Phase 3: Loading-path polish (cache headers, preconnect, progress bar, splash timing).
- Phase 4: Smoke test + deploy. Tag rollback point `:pre-reset` first.

### Effort
~1.5-2 days if CSDM works first try. ~2.5-3 days with the fallback.
