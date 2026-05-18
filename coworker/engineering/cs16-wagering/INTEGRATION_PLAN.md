# CS 1.6 → Hard2Kill Integration Plan

> Created: April 18, 2026
> Status: Draft — ready to execute
> Prereq: Phase 0 complete (multiplayer CS 1.6 running on DigitalOcean droplet `161.35.99.157`, AMX plugin writing `h2k_state.json`, custom overlay polling it)

---

## Goal

Plug the external CS 1.6 browser build into the Hard2Kill platform so a logged-in H2K user can: click **Play → match for $X**, get routed to a live CS 1.6 server, play the deathmatch, and have their H2K balance credited/debited based on the result — with the same escrow guarantees as GladiatorZ and Wasteland.

**Framing (per project memory):** CS 1.6 is becoming *the* game, not a third tab. But we integrate using the existing Wasteland pattern (iframe + Colyseus matchmaking room) to minimize risk, then deprecate the other games once CS volume justifies it.

---

## Current state

### What's built on the CS 1.6 side
- Docker image `yohimik/cs-web-server-metpamx:latest` running on `161.35.99.157` (NYC1, $6/mo droplet)
- Ports: `27016/tcp` (HTTP) + `27018/udp` (WebRTC)
- AMX Mod X plugin `cs16-wagering/cs16-server/h2k_deathmatch.sma` — tracks kills, match state (`waiting → countdown → active → ended`), writes `h2k_state.json` every 1s
- Custom browser client `cs16-wagering/cs16-server/index.html` — polls `/h2k_state.json` every 500ms, renders scoreboard / killfeed / announcements as HTML overlay
- Deathmatch rules: first to 10 kills OR 180s time limit, AK + Deagle + HE + armor loadout

### What's built on the H2K side *(per codebase audit)*
- **Monorepo** at `/Users/stefan/Desktop/Code/game/hard2kill` — npm workspaces, `platform/` (React) + `server/` (Express + Colyseus) + `games/` + `shared/`
- **Matchmaking pattern** proven in `server/src/rooms/WastelandMatchmakingRoom.ts` + `WastelandGameRoom.ts` — queue by bet+currency, deduct on join, credit on win, log to `game_history`
- **Balance helpers** `shared/supabase.ts` — `deductBalance()` (line 164), `creditBalance()` (line 139), `logGameResult()` (line 273)
- **Tables**: `balances (id, balance, coins, pot, …)`, `game_history (winner_id, loser_id, amount, currency, game, started_at, ended_at)`, `transactions`, `profiles`

### What's NOT built (blockers flagged in FOCUS.md)
- `bonus_balance` column on `balances` — **required before real-money CS 1.6 launch** (free-balance exploit, T-001)
- Challenge links — not blocking launch, blocks viral loop
- Multi-tenant Docker pool — current server is a single shared 4-slot instance; at >1 concurrent match players collide

---

## Architecture

```
┌─────────────────────────────────┐         ┌──────────────────────────────┐
│  H2K Platform (React)           │         │  H2K Backend                 │
│  /Users/.../hard2kill/platform  │         │  /Users/.../hard2kill/server │
│                                 │         │                              │
│  Landing.tsx → handleCS16…()    │ ◀─────▶ │  CS16MatchmakingRoom (new)   │
│  CS16Screen.tsx (WASM, new)     │         │  CS16GameRoom (new, proxy)   │
└────────────┬────────────────────┘         └───────────┬──────────────────┘
             │ iframe (HTTPS via Caddy)                 │
             │ Xash3D.Cmd_ExecuteString(`setinfo token …`) │
             ▼                                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  CS 1.6 Docker (DigitalOcean 161.35.99.157, Caddy → :27016/27018)        │
│                                                                          │
│  Xash3D dedicated server (Go HTTP + WASM client, UDP WebRTC on :27018)   │
│  AMX plugin h2k_deathmatch.sma                                           │
│    ├─ reads token via get_user_info(id, "token", …) on client_putinserver│
│    ├─ validates token by line-lookup in /xashds/public/tokens.json       │
│    ├─ writes h2k_state.json every 1s (already works)                     │
│    └─ appends events to h2k_events.jsonl (kill, match_end, …)            │
│                                                                          │
│  Go sidecar (extends existing cs-web-server Go binary OR separate)       │
│    ├─ tails h2k_events.jsonl                                             │
│    └─ POSTs each event to H2K webhook with HMAC signature                │
└─────────────────────┬────────────────────────────────────────────────────┘
                      │ POST /api/cs16/match-result  (signed)
                      ▼
             ┌─────────────────────┐       ┌──────────────────────┐
             │  H2K Backend        │ ────▶ │  Supabase            │
             │  match-result route │       │  balances.balance    │
             │  verifies HMAC      │       │  game_history        │
             │  credits winner     │       │  transactions        │
             └─────────────────────┘       └──────────────────────┘
```

**Key design choices:**

1. **Token via `setinfo`, not query params.** The WASM client runs locally in the browser; there's no HTTP URL the server sees. Instead, `Xash3D.Cmd_ExecuteString()` (confirmed in `examples/react-typescript-cs16/src/App.tsx:19-24`) lets the React wrapper inject console commands — `setinfo token <jwt>` plants the token in the player's userinfo, readable plugin-side via `get_user_info(id, "token", out, len)`. Standard AMX, works on any version.

2. **Sidecar pushes results, plugin stays pure file I/O.** The AMX base bundle does NOT include cURL. `sockets` is present but low-level (hand-roll HTTP). Instead: plugin appends to `h2k_events.jsonl`; a sidecar (Go goroutine inside the existing `cs-web-server` binary, see `docker/cs-web-server/src/server/main.go`) tails it and POSTs to H2K with HMAC. Pushes still beat polling on latency; plugin stays simple.

3. **Polling heartbeat as fallback.** `h2k_state.json` continues to be written; if H2K backend doesn't see a webhook within 30s of expected match end, it polls the state JSON to reconcile.

---

## Phases

### Phase A — Minimum viable integration (3-5 days)

Goal: a logged-in H2K user can click "Play CS 1.6 for $5" and end up in a live deathmatch with their balance debited. Result is resolved on the backend. **No multi-tenant yet — one shared server, one match at a time.**

#### A0. HTTPS on CS droplet — **ALREADY DONE**

`fps.hard2kill.me` is already serving the CS droplet over HTTPS. Iframe from `h2k.app` → `https://fps.hard2kill.me/` works cleanly (no mixed-content). Skip.

UDP/WebRTC on `:27018` stays direct (no TLS needed for game traffic).

#### A1. Database migration (30 min)

Add to `game_history.game` enum (or CHECK constraint) the value `'cs16'`. Add migration:

```sql
-- supabase/migrations/20260418_cs16_game.sql
ALTER TABLE game_history
  DROP CONSTRAINT IF EXISTS game_history_game_check,
  ADD CONSTRAINT game_history_game_check
  CHECK (game IN ('gladiatorz', 'wasteland', 'cs16'));
```

No schema changes needed on `balances` or `transactions` for Phase A — reuse existing cash/coins.

#### A2. Server: CS16 matchmaking + game rooms (1 day)

Copy `WastelandMatchmakingRoom.ts` → `CS16MatchmakingRoom.ts`:
- Same queue-by-`(betAmount, currency)` logic
- On pair found: generate a **match token** = `HMAC-SHA256(secret, matchId|p1Id|p2Id|bet|currency|exp)`, send `'matchmaking:found'` with token + CS server URL
- Match token scoped to one match, expires 10 min after issue

Copy `WastelandGameRoom.ts` → `CS16GameRoom.ts` — but this is a **thin proxy** not a game loop:
- `onJoin()`: validate `odinsId`, call `deductBalance(userId, bet, currency)` (`shared/supabase.ts:164`)
- Store match metadata in room state: `matchId`, `p1Id`, `p2Id`, `bet`, `currency`, `token`, `startedAt`
- `onLeave()`: if match not yet resolved and player disconnected during active state, mark as forfeit (opponent wins — crediting handled by webhook once plugin reports it)
- Do NOT run any game tick — CS server is authoritative
- Set a 10-minute safety timer: if no match-result webhook received, poll `h2k_state.json`, resolve or refund

Register in `server/src/index.ts` around line 159:
```typescript
server.define('cs16', CS16GameRoom).filterBy(['matchId']);
server.define('cs16-matchmaking', CS16MatchmakingRoom);
```

#### A3. Server: match-result webhook (0.5 day)

New Express route in `server/src/index.ts`:
```typescript
app.post('/api/cs16/match-result', express.json(), async (req, res) => {
  const { matchId, winnerId, loserId, winnerKills, loserKills, signature } = req.body;
  // Verify HMAC: signature === HMAC(secret, matchId|winnerId|loserId|winnerKills|loserKills)
  // Idempotency: SELECT * FROM game_history WHERE match_id = matchId
  //   → if exists, return 200 (already processed)
  // Credit winner: creditBalance(winnerId, bet * 2, currency)
  // Log game_history row
  // Broadcast to Colyseus CS16GameRoom so frontend sees result
  res.status(200).json({ ok: true });
});
```

Secret stored in `.env` as `CS16_WEBHOOK_SECRET`, shared with the AMX plugin side.

#### A4. AMX plugin: token read + events file (0.5 day)

Update `cs16-server/h2k_deathmatch.sma` — **pure file I/O, no HTTP**:
- On `client_putinserver(id)`:
  - `get_user_info(id, "token", token_buf, charsmax(token_buf))`
  - `get_user_info(id, "h2k_user", uid_buf, charsmax(uid_buf))`
  - Look up token in `/xashds/public/tokens.json` (written by H2K backend when match is created — see A3). If not present or expired → `server_cmd("kick #%d ^"Invalid match token^"", get_user_userid(id))`
  - Store `g_h2kUserId[id] = uid_buf`
- Append-only event log `h2k_events.jsonl` (one JSON object per line) on:
  - `match_start` — at `start_match()`
  - `kill` — at `event_death()` (already instrumented)
  - `match_end` — at `end_match()` and `end_match_by_time()`, payload = `{matchId, winnerId, loserId, winnerKills, loserKills, reason}`
  - `player_disconnect` — at `client_disconnected()` during active match
- Keep writing `h2k_state.json` for the browser overlay (already works, unchanged)

#### A4b. Go sidecar: tail events, POST to webhook (1 day)

Extend `docker/cs-web-server/src/server/main.go` (or add a separate Go binary in the same container):
- `tail -F /xashds/public/h2k_events.jsonl` (fsnotify or periodic stat)
- For each new line: parse, HMAC-sign with `CS16_WEBHOOK_SECRET`, `POST` to `${H2K_WEBHOOK_URL}/api/cs16/match-result` (or `/api/cs16/event` if generic)
- Retry with exponential backoff (1s, 4s, 16s) on failure
- On 3rd failure: leave line in file, don't advance offset. Backend's 30s state-poll reconciles.
- Persist tail offset to `/xashds/state/events.offset` so restarts don't replay old events

**Why this split:** plugin stays in Pawn with zero network code (easier to reason about, no risk of blocking game tick on a slow HTTP call); Go sidecar is where retries, auth, and signing live. The `cs-web-server` Go process already runs alongside the game server so there's no new process to manage.

#### A5. Frontend: CS16 screen + matchmaking button (0.5-1 day)

Copy `platform/src/screens/ThreeFPS/ThreeFPS.tsx` → `CS16/CS16.tsx`:
- Iframe pointing at `https://fps.hard2kill.me/` (HTTPS via Caddy — see A0)
- The iframe loads the WASM client. After engine init, the parent posts `{token, h2kUserId, host, port}` via `postMessage`, and the iframe calls:
  ```js
  x.Cmd_ExecuteString(`name ${username}`);
  x.Cmd_ExecuteString(`setinfo token ${matchToken}`);
  x.Cmd_ExecuteString(`setinfo h2k_user ${h2kUserId}`);
  x.Cmd_ExecuteString(`connect ${host}:${port}`);
  ```
- Exit button → navigate back to `/` + leave Colyseus room

Update `platform/src/App.tsx` (around line 88):
```tsx
<CS16Screen path="/cs16" />
```

Update `platform/src/screens/Landing/Landing.tsx`:
- Add `handleCS16Matchmaking()` — copy `handleWastelandMatchmaking()` at line 319
- Add CS 1.6 game card in the games tab with bet selector ($1, $5, $10, $25)
- On match found, `navigate('/cs16?matchId=...&token=...')`

#### A6. Deploy & smoke test (0.5 day)

- Deploy backend to staging with `CS16_WEBHOOK_SECRET` set
- Configure CORS on CS 1.6 server to allow `https://h2k.app` iframe load
- Run end-to-end: two browser tabs, both logged into H2K, both queue for $1, play, verify balance moves

**Phase A exit criteria:**
- [ ] Two real H2K users can play a $1 match end-to-end
- [ ] Winner's `balances.balance` goes up by `$2`, loser's goes down by `$1` (debited on join)
- [ ] Row appears in `game_history` with `game = 'cs16'`
- [ ] Disconnect mid-match refunds or pays the remaining player correctly

---

### Phase B — Bonus balance + exploit prevention (2-3 days)

**Blocker for real-money marketing.** Per T-001 (memory: `project_free_balance_exploit.md`), giving anyone free cash without wagering requirements = bot farming. Before we advertise CS 1.6, this must ship.

#### B1. Schema
```sql
ALTER TABLE balances ADD COLUMN bonus_balance numeric DEFAULT 0;
ALTER TABLE balances ADD COLUMN bonus_wagered numeric DEFAULT 0;
ALTER TABLE balances ADD COLUMN bonus_wager_required numeric DEFAULT 0;
```

Rule: bonus wins are locked to bonus pool until `bonus_wagered >= bonus_wager_required` (3× default).

#### B2. Update `deductBalance()` in `shared/supabase.ts:164`
- Take from `bonus_balance` first, then `balance`
- Increment `bonus_wagered` by the portion taken from bonus
- When match resolves to a win, winnings land in `bonus_balance` if any bonus was staked in the bet, else `balance`

#### B3. Update `creditBalance()` at line 139
- Route wins to `bonus_balance` if `bonus_wagered < bonus_wager_required`, else to `balance`

This change is transparent to CS16GameRoom — it just calls the same helpers.

---

### Phase C — Multi-tenant server pool (3-5 days)

The current single 4-slot server means only 2 matches can run in parallel (and they share a map). At >1 concurrent pair we need isolated instances.

#### C1. Server pool manager
- New service `server/src/cs16/ServerPool.ts`:
  - Maintains pool of N Docker containers (start with N=3 = 6 match slots)
  - `acquire(matchId)` → returns `{ host, port, token }` for a free container
  - `release(matchId)` → resets container (new map, wipe AMX state) and returns to pool
- Two deployment options:
  - **Cheap**: one DigitalOcean droplet running 3 containers on different ports via docker-compose
  - **Scalable**: Fly.io machines auto-scale (revisit after Phase A proved the Fly UDP issue is fixable, or stick to Hetzner/DO)
- Start cheap. Re-evaluate at ~10 concurrent matches.

#### C2. `CS16MatchmakingRoom` calls `ServerPool.acquire(matchId)` on pair found, passes the assigned host/port to both clients.

#### C3. Container reset hook
- After match end webhook, `ServerPool.release()` sends `changelevel de_dust2; rcon reset_match` to the AMX plugin
- Or: kill & recreate container (slower but simpler and bulletproof)

---

### Phase D — Primary game pivot (1 week, after Phase A+B ship)

Per single-game CSGO focus decision: once CS 1.6 is live and stable, make it the primary landing experience.

- Move CS 1.6 to the top of `Landing.tsx` games tab; GladiatorZ + Wasteland become secondary cards
- Update marketing copy across `vision/`, `marketing/` docs to lead with CS 1.6
- Optional: deprecate GladiatorZ 2D matchmaking if DAU in CS 1.6 exceeds it within 2 weeks

---

## Data flow: one match, happy path

1. User A clicks "Play CS 1.6 — $5 cash" → `Landing.tsx:handleCS16Matchmaking()` joins `cs16-matchmaking` room with `{bet: 5, currency: 'cash'}`
2. User B does the same
3. `CS16MatchmakingRoom` pairs them, generates `matchId = cs16_${Date.now()}`, mints match tokens via HMAC
4. Backend calls `ServerPool.acquire(matchId)` → returns `{host: '161.35.99.157', port: 27016, rconPass: '…'}` *(Phase C; Phase A is a single hardcoded host)*
5. Both clients receive `'matchmaking:found'` with `{matchId, host, port, token}`, navigate to `/cs16?matchId=...&token=...`
6. `CS16Screen.tsx` mounts iframe → browser loads `http://161.35.99.157:27016/?token=TOKEN_A`
7. Xash3D WASM boots, connects via WebRTC to dedicated server
8. AMX plugin intercepts connect, calls `GET https://h2k.app/api/cs16/verify-token?token=TOKEN_A` → gets back `{userId: UUID, username, matchId}`, stores in `g_h2kUserId[slotId]`
9. When both players present, plugin runs countdown → active state
10. Kills happen; plugin updates `h2k_state.json` and client overlay updates
11. Someone hits 10 kills → `end_match()` called → plugin POSTs to `/api/cs16/match-result` with signed payload
12. Backend verifies HMAC, checks idempotency on `matchId`, calls `creditBalance(winnerId, 10, 'cash')` and `logGameResult({game: 'cs16', winner_id, loser_id, amount: 10, currency: 'cash'})`
13. Backend broadcasts to `CS16GameRoom(matchId)` so the frontend can show the result modal
14. `ServerPool.release(matchId)` resets the container for the next match

## Data flow: failure modes

| Failure | Recovery |
|---------|----------|
| Player A disconnects mid-match | AMX plugin detects `client_disconnected`, ends match with remaining player as winner, POSTs result. CS16GameRoom.onLeave also fires but is idempotent. |
| Both players disconnect | AMX plugin detects empty server, POSTs result with `winnerId = null, refund = true`. Backend refunds both wagers. |
| AMX POST to webhook fails 3× | Plugin writes to `h2k_result_pending.json`. Backend's 10-min safety poll catches it via GET on `h2k_state.json` once `state == 'ended'`. |
| Webhook processed twice (retry storm) | Idempotent insert on `game_history.match_id` — second attempt no-ops. |
| Malicious plugin POST (someone tries to credit themselves) | HMAC verification on webhook. Secret only lives on the CS server's filesystem and in H2K's env. |
| Match token leaked | Token is scoped to one `matchId` + 10-min expiry. Even if leaked, can only join one pre-determined match. |

---

## Decisions resolved (verified Apr 20)

1. ~~**Webhook secret management.**~~ → DigitalOcean droplet env file for Phase A. Mirrored in H2K backend `.env`. Revisit in Phase C when containers are ephemeral.

2. ~~**Token verification endpoint reachable from plugin.**~~ → N/A, moot. Plugin no longer calls out. Tokens are validated file-locally against `tokens.json` written by H2K backend when match is issued.

3. ~~**Iframe HTTPS (mixed-content blocker).**~~ → **Confirmed blocker.** Folded into Phase A0: Caddy container + `fps.hard2kill.me` DNS record.

4. ~~**Single-server Phase A.**~~ → Acceptable. 0 DAU, 5s bot backfill, one shared 4-slot server = 2 concurrent matches max. Fine for week 1.

5. ~~**cURL module in `yohimik/cs-web-server-metpamx`.**~~ → **Not installed.** Base AMX bundle ships `sockets` (low-level) but not `curl`. Redesigned: plugin appends to `h2k_events.jsonl` (pure file I/O, zero HTTP), Go sidecar tails & POSTs. See A4 / A4b.

## New decision needed

6. **Where does the sidecar code live?** Two options:
   - (a) Extend `docker/cs-web-server/src/server/main.go` with a goroutine — single binary, slightly couples wagering to upstream engine fork
   - (b) Add a tiny separate Node.js container to docker-compose — clean separation, one extra process to watch
   - Recommendation: **(b)** for Phase A (faster to iterate in TS, reuses H2K's Node knowledge), revisit merging into (a) only if process footprint matters.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| cURL module missing on Docker image | Medium | Medium | Polling fallback described above. Or rebuild image with cURL. |
| Xash3D doesn't expose `token` query param to plugin | Medium | High | Alternative: use player name as token (`name = matchId.userId.signature`). Uglier but universal. |
| HTTP iframe blocked by mixed content | **High** | High (blocker) | Reverse proxy + Let's Encrypt cert for CS droplet. Caddy with `fps.hard2kill.me` → `:27016`. |
| Single shared server = griefing (player C joins pair A+B match) | High at scale | Medium | Phase C multi-tenancy. For Phase A, AMX plugin rejects unknown tokens on join. |
| Plugin POSTs result for a match H2K backend doesn't know about (desync) | Low | Medium | Backend validates `matchId` exists in Colyseus room registry before crediting. If missing, log and reject. |
| Real-money enabled before bonus balance ships | Low (we control it) | High (exploit T-001 reoccurs) | Gate Phase A rollout: cash bets only for Stefan's own test accounts until Phase B completes. |

---

## Timeline

| Phase | Duration | Calendar |
|-------|----------|----------|
| A: Minimum viable | 3-5 days | Week of Apr 20 |
| B: Bonus balance | 2-3 days | Week of Apr 27 |
| C: Server pool | 3-5 days | Early May (after ≥5 DAU sustained) |
| D: Primary pivot | 1 week | Mid May |

**Total to ship real-money CS 1.6:** ~8 working days (A + B back-to-back).

---

## Checklist to start Phase A

- [x] ~~Verify cURL module available~~ → confirmed NOT installed; redesigned around file events + Go/Node sidecar
- [x] ~~Confirm token delivery mechanism~~ → `setinfo` + `get_user_info()`, no HTTP hook needed
- [x] ~~HTTPS reverse proxy on CS droplet~~ → already live at `fps.hard2kill.me`
- [ ] Generate `CS16_WEBHOOK_SECRET`, add to H2K backend `.env` + CS droplet env
- [ ] Confirm outbound 443 open from CS droplet to `h2k.app` backend
- [ ] Write SQL migration for `game_history.game = 'cs16'`
- [ ] Branch from main in `/Users/stefan/Desktop/Code/game/hard2kill` for integration work
- [ ] Decide sidecar location (Decision #6 above) — Node container recommended

Files that will be created:
- `server/src/rooms/CS16MatchmakingRoom.ts`
- `server/src/rooms/CS16GameRoom.ts`
- `server/src/routes/cs16MatchResult.ts` (or inline in `server/src/index.ts`)
- `platform/src/screens/CS16/CS16.tsx`
- `supabase/migrations/20260418_cs16_game.sql`
- `cs16-wagering/cs16-server/sidecar/` (Node.js: tail events, POST to H2K)

Files that will be edited:
- `cs16-wagering/cs16-server/docker-compose.yml` — add sidecar service
- `server/src/index.ts` — register rooms, add webhook route
- `platform/src/App.tsx` — add `/cs16` route
- `platform/src/screens/Landing/Landing.tsx` — CS 1.6 game card + matchmaking handler
- `cs16-wagering/cs16-server/h2k_deathmatch.sma` — read `setinfo token`, append events to JSONL
- `cs16-wagering/cs16-server/index.html` — bridge parent `postMessage` → `Cmd_ExecuteString` for token/name/connect
