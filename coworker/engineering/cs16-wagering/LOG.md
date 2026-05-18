# CS 1.6 Unification — Live Log

> This file is the **current state** tracker. Updated at the start and end of every work session.
> See `ROADMAP.md` for the full plan, `CHANGELOG.md` for the historical record.

---

## Right now

**Current phase:** Phase 0/1/2 shipped. Pending Phase 3 (cache polish) + Phase 4 (smoke test).
**Current step:** Droplet serving `valve-dust2.v1.zip` (232 MB, down from 415). HARD2KILL branded boot live. Ready for Phase 3 or course-correction.
**Last updated:** 2026-04-23

### Scope reset (Apr 22)
The April 21 wagering-first plan is superseded. New goal: `fps.hard2kill.me` loads → assets auto-download with progress → JOIN enables at 100% → one click → spawn in TDM on `de_dust2`. Wagering is parked (not deleted), re-added in a later Phase 5+. See `ROADMAP.md` for the new plan.

### In progress
- Phase 0.1/0.2/0.3 all shipped Apr 22. Droplet running `yohimik/cs-web-server-metpamx:latest` + custom `h2k_tdm.amxx` plugin. `cs16-pre-reset` image + container preserved for rollback.
- Pending: browser smoke test (two incognito tabs, verify auto-team-join, AK/Deagle/nade loadout, instant respawn, no bomb).

### Blocked
- None.

### Next (once browser test passes)
Phase 1 — Branded client entrypoint:
1. Rewrite `cs/client/src/main.ts` — strip URL-param wagering logic, leave `parseMatchParams()` no-op stub.
2. Auto-download on page load (fetch + ReadableStream byte counter), live progress bar.
3. JOIN button disabled until 100%, then one-click `x.init()` + `x.main()` + `connect <droplet>:27015`.
4. Rewrite `cs/client/src/index.html` as HARD2KILL boot splash.
5. Vite config: drop `libref_soft.wasm`, test whether `libmenu.wasm` is needed.
6. `./scripts/build-client.sh` → `./scripts/install-client.sh` to deploy.

Phase 2 — slim valve.zip on droplet via `./scripts/slim-valve.sh` → ~60-80 MB target. Switch `VALVE_ZIP` in `.env` to the slim version.

---

## Environment snapshot

**Droplet (`161.35.99.157` / `fps.hard2kill.me`):**
- DigitalOcean $6/mo, NYC1, Ubuntu 24.04, 1 vCPU, 1GB RAM
- Running stock `yohimik/cs-web-server-metpamx:latest` container named `cs16`
- Plugin v3.0 currently compiled + loaded (pre-tokenization version)
- Symlink `/xashds/public/h2k_state.json` already exists
- `/root/valve.zip` has CS assets cached (415MB, don't re-download)

**Railway (`hard2kill.com`):**
- Express + Colyseus backend; serves React frontend from same origin
- Latest backend changes (CS16 rooms, webhook route, Landing card) **not yet deployed**
- `CS16_WEBHOOK_SECRET` env var **not yet set**

**Local (`/Users/stefan/Desktop/Code/game/`):**
- `hard2kill/` — frontend + backend (CS16 wagering code lives here, parked for Phase 5+).
- `cs/` — NEW. Self-contained CS droplet deployment. Active as of Apr 22 after reset.
- `cs16-wagering/` — upstream `github.com/yohimik/webxash3d-fwgs` checkout. Reference only. `cs16-server/` subdir still holds the pre-reset originals as a safety copy; remove once Phase 0 validates on droplet.

---

## Decisions log (append-only)

- **2026-04-17** — Dropped asset replacement phase (Phase 1 of original PLAN.md). Stefan: "it's perfect as it is, let's focus on core functionalities of introducing wagering."
- **2026-04-20** — Chose redirect (not iframe) for the CS client. Loses in-H2K win modal; gains no-postMessage-race simplicity.
- **2026-04-20** — Chose Path A (no custom overlay for Phase 1). Vanilla upstream CS UI during play. Overlay re-integration deferred to Phase 4.
- **2026-04-20** — Plugin + sidecar architecture: plugin writes pure JSONL, Node sidecar tails+verifies+POSTs. No HTTP in the Pawn plugin.
- **2026-04-21** — Bundle source at `docker/cs-web-server/src/client/main.ts` confirmed as the build target. Modified to read `?token=` from URL + run `setinfo`.
- **2026-04-21** — Decided to finish Phase 1 deploy BEFORE the code merge (Phase 2). Isolate failures.
- **2026-04-21** — Dropping custom Dockerfile; droplet's legacy Docker can't multi-stage cross-platform. Stock image + bind mounts is simpler and matches Stefan's existing workflow.
- **2026-04-22 — RESET.** Stefan: "let's start over with this CS-GO implementation from the beginning". New goal is minimal: load URL → auto-download → JOIN → spawn in TDM on de_dust2. Wagering parked, not deleted. Stefan: "don't work two codebases, just one" — consolidate `cs16-wagering/` into `hard2kill/cs16/`. April 21 wagering-first roadmap superseded; see `ROADMAP.md`.
- **2026-04-22** — Gameplay rules: team deathmatch, no bomb defusal. Bomb mode + wagering plugin parked until Phase 5+.
- **2026-04-22** — Boot UX: downloads start on page load (no click required to begin fetch); JOIN button flips enabled at 100%, click triggers engine boot + connect.
- **2026-04-22** — In-match UI: vanilla engine HUD only. Branded HARD2KILL boot screen hides after first rendered frame. Wagering overlay (balance, +$/-$ killfeed, YOU WIN/LOSE) parked.
- **2026-04-22** — Keep all 8 stock player models (urban/gsg9/sas/gign/terror/leet/arctic/guerilla). Team-select is the core flow.
- **2026-04-22** — Droplet endpoint topology unchanged: `fps.hard2kill.me` → Caddy → Go HTTP `:27016` + WebRTC `:27018/udp`.
- **2026-04-22** — Folder layout: `cs16-wagering/` stays in its own folder, strictly self-contained (no shared tsconfig/workspaces/node_modules with `hard2kill/`). HTTP-only coupling when wagering re-lands. Overrides earlier "fold into `hard2kill/cs16/`" plan. Rationale: keeps all future repo-shape pivots open (hard2kill stripped; auth/wagering colocated in `cs16-wagering/server/`; or `cs16-wagering/` becomes the new project home) without restructuring.
- **2026-04-22** — Reserve the `server/` name inside `cs/` for a future Node auth/wagering service. CS game-server config goes under `cs-server/`.
- **2026-04-22** — Option B confirmed: extract our code to a new peer folder `/Users/stefan/Desktop/Code/game/cs/` rather than restructure inside the upstream `cs16-wagering/` Lerna monorepo. Rationale discovered during execution: `cs16-wagering/` turned out to be a clean upstream checkout with our patches layered on top of tracked files — option A would have coupled us to upstream's working tree permanently.
- **2026-04-22** — Phase 0.1 complete. `/Users/stefan/Desktop/Code/game/cs/` holds: `docker-compose.yml` (sidecar commented out), `.env.example` (wagering vars commented), `client/` (Vite bundle source + configs), `cs-server/plugins/` (empty, CSDM drops here), `parked/{plugin,sidecar,overlays,scripts,fly.toml}`, `scripts/{deploy,build-client,install-client,slim-valve,resync-upstream}.sh`, `README.md`. No references from active files into `cs16-wagering/` or `hard2kill/` beyond intentional docs + the upstream-resync script. Total size 184KB.

---

## Risk register (updated as we learn)

| Risk | Likelihood | Impact | Status |
|------|-----------|--------|--------|
| Plugin `setinfo` readable by `get_user_info` in WebRTC context | Med | High | **Untested** — will know at first match |
| Old Docker on droplet blocks automated plugin compile | Resolved | — | Moved to post-start exec script |
| Railway backend rejects webhook (signature mismatch) | Med | Med | Mitigated by gen-secret script mirroring both sides |
| Free-play on `fps.hard2kill.me` collides with paid match on shared server | Low (0 DAU) | Med | Accepted for Phase 1; Phase 2+ gates anonymous play |
| Merge (Phase 2) breaks backend in ways not caught by typecheck | Med | High | Sequenced AFTER Phase 1 validation |

---

## Session notes

### 2026-04-21 — Session 1
- Diagnosed Docker BuildKit / platform stitching error
- Stefan asked for a unified plan before doing more deploy work
- Created `ROADMAP.md` + this `LOG.md`
- Decision: drop custom Dockerfile, go simpler
- Deleted `cs16-server/Dockerfile`
- Rewrote `docker-compose.yml` to use stock `yohimik/cs-web-server-metpamx` image + bind-mount `/root/valve.zip`
- New scripts: `install-plugin.sh` (docker exec amxxpc + symlinks + restart), `install-client.sh` (docker cp bundle), `deploy.sh` (orchestrator)
- Next session starts with rsync + `./scripts/deploy.sh` on droplet

### 2026-04-23 — Session 5 (Phase 1 + Phase 2)
- **Phase 1 shipped.** Rewrote `cs/client/src/{index.html,main.ts}` with HARD2KILL branded boot (black background, red accent `#ff2e2e`, bold "Hard2Kill" wordmark with red 2). Auto-download on page load with byte-counting progress (`X.Y / Z.Z MB`). JOIN button gated on 100% completion, flips from "Loading" (disabled) to "Join Match" (red, enabled). Removed yohimik social links + logo.
- Removed the auto-jointeam/joinclass hack from main.ts — let CSDM team+weapon menus run naturally.
- Added Page Visibility API handler: tracks `hiddenAt`, if tab was hidden >90s and user had connected before, shows a "Connection dropped / Reconnect" overlay on return.
- Kept `parseMatchParams()` as no-op stub for Phase 5+ wagering (returns null today; flip to real impl when wagering re-lands).
- Bug: first Phase 1 deploy broke because `webrtc.ts` lines 97+177 reference `document.getElementById('warning')!.style` but I removed the `<p id="warning">` from HTML. `!` assertion lied, throw happened inside `channel.onopen` before `resolve()` fired, `engine.init()` never resolved, JOIN stayed "Loading" forever. Fix: null-safe `if (warn)` guards in webrtc.ts + re-added `<p id="warning">` element styled to fit theme. Committed as `f3eadb7`.
- **Phase 2 shipped.** `slim-valve.sh` stripped `valve.zip` from 415 MB → 232 MB (44% reduction). Kept all 8 player models + all weapons + de_dust2 + shared assets. Dropped 24 other maps, HL SP, bot nav, intro media. Updated `.env` with `VALVE_ZIP=/root/valve-dust2.v1.zip`. Container recreated; hit + worked around docker-compose 1.29.2 ContainerConfig bug again (`docker rm -f cs16` first).
- Noted: more aggressive slim possible (1 CT + 1 T model = another ~80-100 MB savings, landing ~130-150 MB). Tabled pending Stefan's call.
- Git history: `21083b0` Phase 0 baseline, `4262752` Phase 1, `f3eadb7` null-safe fix. No remote pushed.

### 2026-04-23 — Session 4 (CSDM + reproducibility)
- Tested h2k_tdm v0.1 auto-team-assign → caused `Uncaught RuntimeError: remainder by zero` WASM trap. Root cause: plugin forcibly set team via `cs_set_user_team` before engine had registered player with team-specific spawn logic.
- Shipped h2k_tdm v0.2 (removed auto-team-assign, let engine's native team+model menus run) and v0.3 (Ham_Killed pre-hook to beat round-end check).
- Stefan reported "feels round-based, not TDM" in 2-player test. Explained CS 1.6 has no native TDM — all "TDM servers" are plugin hacks on bomb-defusal.
- Decision: install **CSDM 2.1.2** (BAILOPAN, 2011) instead of iterating on custom TDM plugin. Downloaded from bailopan.net/csdm/, installed 5 plugins (csdm_main, csdm_equip, csdm_spawn_preset, csdm_misc, csdm_protection) + configs into running container. Works: TDM, custom spawn points on de_dust2, weapon menu on spawn, bomb removed, no round-end.
- Bumped `sv_timeout` from default 65s to 600s (via server.cfg) as cheap fix for "tab backgrounded → GoldSrc main menu" bug. Real fix is Phase 1 Page Visibility API.
- **Housekeeping (Track B):** made Phase 0 reproducible.
  - Vendored `csdm-2.1.2.zip` into `cs/parked/csdm/`
  - Created `cs/cs-server/server.cfg` with HARD2KILL branding + TDM cvars
  - Bind-mounted server.cfg in docker-compose.yml (cvars now survive container recreation)
  - Wrote `cs/scripts/install-csdm.sh` — idempotent plugin+config install
  - Updated `cs/scripts/deploy.sh` to run install-csdm.sh
  - Parked `h2k_tdm.sma` (CSDM replaced it) and `install-plugin.sh` (h2k_tdm-specific)
  - Hit docker-compose 1.29.2 `ContainerConfig` bug on recreate; workaround: force-remove stray containers, then `docker-compose up -d` works
  - Proven end-to-end: wiped container → `docker-compose up -d` → `install-csdm.sh` → working TDM server
  - `git init` + baseline commit at `cs/` root (commit 21083b0)
- Next: Phase 1 — branded HARD2KILL boot, auto-download, JOIN button, Page Visibility API for the tab-background bug.

### 2026-04-22 — Session 3 (Phase 0 shipped)
- Stefan wrote a minimal TDM plugin `cs/cs-server/plugins/h2k_tdm.sma v0.1` (no tokens/events/wagering — auto-team-assign, AK+Deagle+HE loadout, instant respawn on death, cvar enforcement in plugin_init).
- New `cs/scripts/install-plugin.sh` (compiles in-container via `amxxpc`, registers in plugins.ini, removes stale `h2k_deathmatch.amxx`, restarts).
- `cs/scripts/deploy.sh` updated to call `install-plugin.sh` when the plugin source is present.
- Ran full re-deploy via sshpass (with Stefan's explicit password share): rsync cs/ → droplet, `docker stop/rm cs16`, `./scripts/deploy.sh`. Plugin compiled (2736 bytes code), loaded cleanly (`[H2K TDM] v0.1 loaded`).
- Cleaned up orphan `h2k-sidecar` container (pre-reset artifact still running — removed).
- `cs16-pre-reset` container + `h2k-cs16:pre-reset` image kept on droplet as rollback.
- Next: browser smoke test, then Phase 1 (branded entrypoint).

### 2026-04-22 — Session 2 (reset)
- Stefan: "too entangled in a project", asked for a full deep-dive of the workspace
- Read all coworker docs + memory; surfaced six tangles (three products in-repo vs single-game memory; two GTM playbooks; budget mismatched to demoted plan; two repos; launch gate after launch work; "prediction market" framing ahead of product reality; 0 DAU)
- Stefan chose the reset: CS 1.6 only, deathmatch only, wagering parked
- Collaborated on the new 5-phase plan (Phase 0 restructure+TDM → Phase 4 smoke test)
- Design call: downloads start on page load, JOIN enables at 100%
- Revised the folder-shape call: `cs16-wagering/` stays in its own folder (NOT folded into `hard2kill/`). Self-contained. Reserves `server/` name for future auth/wagering. Keeps all future pivots open (hard2kill strip, auth colocation, or CS becoming the new home).
- Rewrote `ROADMAP.md`, updated this `LOG.md`, appended reset entry to `CHANGELOG.md`
- Next session starts Phase 0.1 — internal restructure of `cs16-wagering/`. Can be executed from this session (absolute paths).
