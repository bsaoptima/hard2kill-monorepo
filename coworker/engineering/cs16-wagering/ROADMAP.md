# Hard2Kill CS 1.6 — Reset Roadmap

> Reset: April 22, 2026. Supersedes the April 21 wagering-first plan.
> Goal: `fps.hard2kill.me` → assets auto-download with live progress → JOIN enables at 100% → one click → spawn on `de_dust2` in team deathmatch with engine team-select menu.
> Wagering is parked (not deleted), architected to re-add without rewriting.

---

## North star

Single-codebase, single-game product. Ship the base (classic TDM on de_dust2) before layering wagering on top.

**End-state at Phase 4:**
- Visit `fps.hard2kill.me` on any modern desktop browser
- Branded HARD2KILL boot screen renders instantly
- `valve-dust2.v1.zip` (~60-80 MB) streams with a real byte-counting progress bar
- JOIN button flips from disabled → enabled at 100%
- One click → Xash3D boots → connects to the dedicated server → engine's CS team-select menu → pick CT/T → spawn
- Instant respawn on death, map timer, no bomb, no buy-time friction

---

## Why this resets the April 21 roadmap

The April 21 plan interleaved wagering infra (tokens, HMAC, webhooks, `CS16MatchmakingRoom`, Node sidecar) with getting CS 1.6 to play end-to-end. Weeks in, zero real paid matches had run and the basic "does the game load and play?" bar hadn't cleared.

The reset collapses scope to that one bar. When it clears, wagering layers back in using the same droplet, same client bundle, same plugin slot — all parked in git, not rewritten.

Secondary decision: **`cs16-wagering/` stays in its own folder, strictly self-contained.** No shared `tsconfig`, `package.json` workspaces, or `node_modules` with `hard2kill/`. HTTP-only coupling when wagering re-lands. This keeps all future integration paths open — whether `hard2kill/` gets stripped down to a wagering/auth shell, whether auth/wagering moves into `cs16-wagering/` as a sibling Node service, or whether `cs16-wagering/` becomes the new project home outright.

Internal layout to support that:

```
cs16-wagering/
├── docker-compose.yml
├── .env.example
├── cs-server/              # CS dedicated server config (AMX, cvars, assets)
│   ├── server.cfg
│   ├── plugins/
│   └── valve-dust2.v1.zip
├── client/                 # Vite bundle (WASM engine + HARD2KILL boot)
│   ├── src/main.ts
│   └── index.html
├── parked/
│   ├── plugin/h2k_deathmatch.sma     # 1v1 wager plugin, in git, not deployed
│   └── sidecar/                       # Node event-tailer, in git, not deployed
└── scripts/
    ├── deploy.sh
    ├── slim-valve.sh
    └── build-client.sh
```

Key naming call: the CS game-server config goes under `cs-server/`, not `server/`. Reserves the `server/` name for the eventual Node auth/wagering service if it ever colocates here.

---

## Phase sequence

### Phase 0 — Restructure + TDM plugin (half a day)

**0.1 Restructure `cs16-wagering/` internally** (no cross-repo moves).
- Rename `cs16-wagering/cs16-server/` → `cs16-wagering/cs-server/` (reserves `server/` for future Node services)
- Move bundle source from `cs16-wagering/docker/cs-web-server/src/client/` → `cs16-wagering/client/`
- Move `h2k_deathmatch.sma` → `cs16-wagering/parked/plugin/`
- Move sidecar Node code → `cs16-wagering/parked/sidecar/`
- Add `.env.example` at root with `MATCH_WEBHOOK_URL=` (empty today) and `# CS16_WEBHOOK_SECRET=` (commented)
- Verify: no imports/tsconfig/package.json references from `cs16-wagering/` into `hard2kill/`. Self-contained.
- Archive the remaining `cs16-wagering/docker/` directory as `cs16-wagering/archive/` if not used anymore (do not delete — upstream fork fallback)

**0.2 Drop wagering plugin + sidecar.**
- Remove `h2k_deathmatch.amxx` from `plugins.ini`
- Remove `sidecar` service from `docker-compose.yml`
- Keep the `.sma` source + sidecar code in git (parked)

**0.3 Install team deathmatch.**
- Primary: **CSDM** (standard community AMX Mod X plugin). Drop into `addons/amxmodx/plugins/`. Config: TDM, instant respawn (1-2s), weapon menu on spawn, bomb disabled, long map timer.
- Fallback (if CSDM won't load on the ludufre AMX fork): strip `h2k_deathmatch.sma` down to TDM rules — remove tokens, events JSONL, 10-kill limit; add team scoring. Budget: 1 extra day.

**0.4 Server cvars** (`server.cfg`):
- `mp_friendlyfire 0`, `mp_autoteambalance 1`, `mp_limitteams 2`
- `mp_buytime 0`, `mp_freezetime 0`, `mp_startmoney 16000`, `mp_timelimit 30`

**Exit:** two browser tabs join, pick opposite teams, shoot, instant respawn, no bomb prompts, scores tick on the HUD.

### Phase 1 — Branded client entrypoint (half a day)

**1.1 Rewrite `main.ts`.**
- Delete URL-param wagering logic (`?token=`, `?matchId=`, `?name=`, `h2k:connect` postMessage bridge)
- Leave a no-op `parseMatchParams()` stub that returns `null` today (re-add hook)

**1.2 Auto-download on page load.**
- Immediately fetch `valve-dust2.v1.zip` + critical WASM via `fetch()` + `ReadableStream` byte counter
- Live progress bar wired to the byte counter
- JOIN button disabled/grayed until 100%

**1.3 One-click launch.**
- On JOIN click: `x.init()` → `x.main()` → `Cmd_ExecuteString("name Player; connect <server>:27015")`
- Server host parameterized via env var on the client build (default = shared droplet). Phase 5+ multi-tenant swaps this per match.
- Engine's native team-select menu appears on spawn — no custom team UI

**1.4 Rewrite `index.html`.**
- HARD2KILL wordmark, one-line tagline, progress bar, JOIN button, version string
- Hide splash only after engine reports first rendered frame (not when `init()` resolves — avoids black-canvas limbo)
- No in-match overlay. Vanilla engine HUD during play.

**1.5 Vite config.**
- Target `esnext`, single chunk, Terser minify
- Drop `libref_soft.wasm` from the bundle (force WebGL2)
- Test whether `libmenu.wasm` is required when we skip stock main menu — drop if not (~1 MB)

**Exit:** cold incognito load of `fps.hard2kill.me` → HARD2KILL boot renders → download starts immediately → JOIN enables at 100% → one click → in-game team-select menu up.

### Phase 2 — Slim `valve.zip` to dust2-only (half a day)

**2.1** Write `cs16-wagering/scripts/slim-valve.sh` — unzip stock `valve.zip`, filter, rezip as `valve-dust2.v1.zip`.

**2.2 Keep:**
- `cstrike/maps/de_dust2.bsp` only
- All weapon models (`cstrike/models/v_*.mdl`, `p_*.mdl`, `w_*.mdl`) — buy menu is live in TDM
- All 8 player models (`urban`, `gsg9`, `sas`, `gign`, `terror`, `leet`, `arctic`, `guerilla`)
- `cstrike/sound/weapons`, `player`, `radio`, `items`, `ambience`
- `cstrike/sprites/*` (HUD, crosshairs, smoke, explosion)
- WADs referenced by de_dust2: `cstrike.wad`, `halflife.wad`, `decals.wad`, `gfx.wad`, `de_dust2.wad` if present
- `cstrike/dlls/`, `cl_dlls/`, `liblist.gam`, `gamedir.txt`
- Minimal shared `valve/` base (sprites, sounds, shared models)

**2.3 Drop:**
- The other ~24 maps (~200 MB gone)
- `cstrike/overviews/` for non-dust2 maps
- Half-Life SP maps/models in `valve/`
- Demos, recordings
- Map-specific WADs for non-dust2 maps

**2.4 Mount on droplet.** Bind `valve-dust2.v1.zip` into container at `/xashds/public/valve.zip` (engine-facing filename stays `valve.zip`). Version the host-side filename for cache busting.

**2.5 Measure.** `du -sh` before/after. Chrome throttled "Fast 3G" cold-load click-to-spawn timing.

**Exit:** zip under 80 MB, de_dust2 renders with no missing-texture checkerboards, all weapons + all 8 player models spawn correctly.

### Phase 3 — Loading-path polish (few hours)

- Caddy cache headers: `Cache-Control: public, max-age=31536000, immutable` for `valve-dust2.v1.zip` + WASM. Bump to `v2` to invalidate.
- `<link rel="preconnect" href="https://fps.hard2kill.me">` in HTML
- `<link rel="preload" as="fetch" crossorigin>` for critical WASM
- Real byte-counting progress bar, not a spinner ("42 / 78 MB" beats "Loading…")
- Splash overlay stays until engine posts first rendered frame

**Exit:** cold load < ~20s on decent bandwidth; cache-hit load < ~5s.

### Phase 4 — Smoke test + deploy (1-2 hours)

- Tag current working droplet image as `:pre-reset` before any changes (rollback anchor)
- Test matrix: Chrome, Firefox, Safari on desktop. Mobile browsers best-effort, not a blocker.
- Two-tab smoke: both join, opposite teams, shoot each other, respawn works, scores tick, map timer ends cleanly
- If CSDM path turned flaky → drop to the strip-`h2k_deathmatch` fallback (+1 day)

---

## Parked for Phase 5+ (wagering re-add)

When the base is shipped and stable, wagering layers back on without rewrites. Parked items stay in git, excluded from current build/deploy:

**In `cs16-wagering/`:**
- `parked/plugin/h2k_deathmatch.sma` — 1v1 wager plugin
- `parked/sidecar/` — Node service (tails events, HMAC-POSTs to webhook)
- `client/src/main.ts` `parseMatchParams()` stub — flip from `return null` to real implementation
- `.env.example` — `MATCH_WEBHOOK_URL` + `CS16_WEBHOOK_SECRET` slots

**In `hard2kill/` (current home of wagering + auth; might be stripped or relocated later):**
- `server/src/rooms/CS16MatchmakingRoom.ts`, `CS16GameRoom.ts`
- `server/src/cs16/tokens.ts`, `matchEvents.ts`
- `POST /api/cs16/match-result` webhook route
- `platform/src/screens/Landing/Landing.tsx` CS16 game card (hidden, not deleted)
- `CS16_WEBHOOK_SECRET` env (commented in `.env.example`)

**Re-add sequence when we come back here:**
1. Ship the bonus-balance + wagering-requirement system first (FOCUS.md prereq — T-001 protection against free-balance bot farming).
2. Swap CSDM plugin back to `h2k_deathmatch` (or a CSDM-compatible event hook variant).
3. Set `MATCH_WEBHOOK_URL` + `CS16_WEBHOOK_SECRET` in `cs16-wagering/.env`. Uncomment the sidecar service in `docker-compose.yml`.
4. Wherever auth/wagering lives at that point (`hard2kill/`, a stripped shell, or inlined into `cs16-wagering/server/`), reactivate the matchmaking + game rooms + webhook route.
5. Un-hide the Landing card. Flip the `parseMatchParams()` stub to return real match metadata.
6. First paid match smoke test.

**Directional note on future repo shape:** `hard2kill/` may eventually get stripped to just auth + wagering (other games removed). If that happens, two options stay open with the current layout: (a) `hard2kill/` stays as a peer service deployed separately from the CS droplet; (b) auth + wagering moves into `cs16-wagering/server/` (the deliberately-reserved name) and ships in the same droplet `docker-compose.yml` as the CS game server. Either way, the CS folder doesn't restructure.

---

## Total effort

~1.5-2 days if CSDM works first try. ~2.5-3 days if we fall back to the `h2k_deathmatch` strip.

---

## Related docs (context, not the live plan)

- `GOAL.md` — project definition, success criteria (still accurate)
- `WIKI.md` — 12 technical claim verifications (still accurate)
- `PLAN.md` — original 4-phase plan including asset replacement (skipped per Apr 17 decision)
- `INTEGRATION_PLAN.md` — wagering integration details (parked; use when Phase 5+ starts)
- `CHANGELOG.md` — historical record; see the Apr 22 reset entry
- `LOG.md` — current live status
