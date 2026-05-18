# Geostakes — MVP Sprint Plan

Date locked: 2026-04-27
Estimated elapsed: ~3 weeks of focused work, broken into 6 shippable sprints.
Each sprint ends in a demoable state (you can poke at it locally and confirm before moving on).

---

## Locked decisions feeding this plan

- **Brand:** Geostakes
- **Codebase:** standalone Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui at `/Users/stefan/Desktop/Code/game/geostakes`
- **Data layer:** shared with hard2kill (same Supabase project, same `balances` / `transactions` / `game_history` tables)
- **Realtime:** Supabase Realtime (channels + presence). No Colyseus.
- **Match format:** locked 1v1, 5 rounds × 60s, single pot at match start, **$1 / $5 / $10** ladder, 10% house rake, forfeit-on-disconnect = full pot
- **Bonus balance + WR:** in v1. Extend shared `balances` schema with `bonus_balance` + `wagering_remaining`. Cash deducts first; bonus only converts to withdrawable when WR = 0.
- **Maps:** Google Street View, lean on Google's free tier
- **Anti-cheat:** deferred. Server-side location drip is the only baseline (not anti-cheat, just architecture).
- **OSS clones (`geohub`, `geoguess-lite`):** read-only design references, not forked.

---

## Sprint 0 — Foundation (~2 days)

**Goal:** A deployable Next.js shell with Supabase auth working against the hard2kill project, balance display in header.

- Bootstrap Next 14 App Router + TS + Tailwind + shadcn/ui at `/game/geostakes`
- Configure Supabase client with hard2kill's `SUPABASE_URL` + anon key; service-role key for server-only routes
- Auth: Supabase Auth (email magic link + Google OAuth — same providers hard2kill uses). Sign-in / sign-up / sign-out
- Layout shell: header (logo, balance pill, sign-in button), bare main slot, footer
- Header balance pill reads `balances` row for current user (cash + bonus) — read-only, no betting yet
- Vercel preview deploy (so we have a live URL from day 1)

**Demo:** sign in with a hard2kill account, see the same balance you have in hard2kill displayed in the Geostakes header.

---

## Sprint 1 — Wallet, Stripe, bonus balance (~3–4 days)

**Goal:** A user can deposit via Stripe and see real cash + bonus balance update. Wagering-requirement logic is in place even though no game exists yet (we test it with manual bets via API).

### Schema migration (shared Supabase project — affects hard2kill too)

```sql
ALTER TABLE balances
  ADD COLUMN bonus_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN wagering_remaining numeric NOT NULL DEFAULT 0;

ALTER TYPE transaction_type ADD VALUE 'bonus_grant';
ALTER TYPE transaction_type ADD VALUE 'bonus_convert';
```

(Coordinate with hard2kill — these columns appear there too. They'll default to 0 so it's a no-op for existing CS users until we hand out bonuses.)

### Backend

- Port `creditBalance` / `deductBalance` from hard2kill `shared/supabase.ts`, add bonus-balance variants:
  - `deductForWager(userId, amount, currency)`: try cash first, then bonus. Returns `{ from: 'cash' | 'bonus' | 'mixed', cashUsed, bonusUsed }`
  - `creditWinnings(userId, amount, currency)`: credits cash only (winnings are always real, never bonus)
  - `decrementWageringRequirement(userId, amount)`: every bonus-balance dollar wagered decrements WR by that dollar
  - `convertBonusIfEligible(userId)`: if WR ≤ 0 and bonus_balance > 0, move bonus → cash, log `bonus_convert` transaction
- Stripe checkout endpoint (`POST /api/stripe/checkout`) — port from hard2kill `server/src/index.ts:125-165`
- Stripe webhook (`POST /api/stripe/webhook`) — port from `index.ts:39-75`. On `checkout.session.completed`: credit cash + log `deposit` transaction
- (Optional MVP-extra) signup bonus: on first sign-in, grant `$5 bonus_balance` + `wagering_remaining = $25` (5x). Easy way to test bonus flow.

### Frontend

- Deposit modal: $5 / $10 / $25 / $50 buttons → Stripe checkout → success URL → balance refreshes
- Balance pill in header shows `cash` and `bonus` separately, with a tiny "?" tooltip explaining WR

**Demo:** deposit $5, see cash balance bump. Use Supabase SQL editor to grant a $5 bonus, see it appear separately. Manually call the deduct API, watch WR decrement.

---

## Sprint 2 — Match infra (no UI yet) (~3–4 days)

**Goal:** From a script or Postman, you can create a match between two test users, drip locations one round at a time, accept guesses, score them server-side, settle the pot. End-to-end, no frontend.

### Schema

```sql
CREATE TABLE geostakes_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pano_id text,                 -- Google Street View pano ID
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  difficulty smallint DEFAULT 3, -- 1-5, for future filtering
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE geostakes_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL,          -- 'queued'|'active'|'settled'|'refunded'
  bet_amount numeric NOT NULL,
  currency text NOT NULL,        -- 'cash'|'coins'
  player1_id uuid NOT NULL,
  player2_id uuid NOT NULL,
  current_round smallint DEFAULT 0,  -- 0 = not started, 1-5 = playing, 6 = ended
  round_started_at timestamptz,      -- server-authoritative timer anchor
  winner_id uuid,
  forfeit_reason text,           -- 'disconnect'|'timeout'|null
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE geostakes_match_locations (
  match_id uuid REFERENCES geostakes_matches(id) ON DELETE CASCADE,
  round_number smallint NOT NULL,
  location_id uuid REFERENCES geostakes_locations(id),
  PRIMARY KEY (match_id, round_number)
);

CREATE TABLE geostakes_round_guesses (
  match_id uuid REFERENCES geostakes_matches(id) ON DELETE CASCADE,
  round_number smallint NOT NULL,
  player_id uuid NOT NULL,
  guess_lat double precision,
  guess_lng double precision,
  distance_meters double precision,
  points integer,                -- server-computed
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, round_number, player_id)
);
```

### Backend logic (port from `hard2kill/server/src/cs16/matchEvents.ts`)

- `createMatch(p1Id, p2Id, betAmount, currency)`:
  - Pre-pick 5 random locations from `geostakes_locations`, write to `geostakes_match_locations`
  - `deductForWager` from both players atomically; on either failure, refund and abort
  - Insert `geostakes_matches` with status `'active'`, `current_round = 1`, set `round_started_at = now()`
  - Returns matchId
- `getCurrentRoundLocation(matchId, userId)`:
  - Validates `userId` is in the match
  - Returns ONLY the current round's `pano_id` + a hint for Street View init (NOT lat/lng — server keeps that private)
- `submitGuess(matchId, userId, lat, lng)`:
  - Validates match active, round in progress, user hasn't already guessed
  - Computes Haversine distance from server-known truth
  - Computes GeoGuessr-style score: `5000 * exp(-distance_km / 2000)` (or whatever formula we settle on — port from `geohub/backend/utils/calculateRoundScore.ts`)
  - Inserts row into `geostakes_round_guesses`
  - If both players guessed OR 60s elapsed → advance round
- `advanceRound(matchId)`:
  - Auto-zero any missing guess (player ran out of time)
  - If `current_round < 5`: increment, set new `round_started_at`
  - If `current_round = 5`: settle match — sum points per player, winner = higher total, credit `bet * 2 * 0.9` to winner via `creditWinnings`, log to `game_history` with `game: 'geostakes'`, mark settled
- `forfeitMatch(matchId, forfeitingUserId)`:
  - Other player wins, full pot to them (no rake on forfeits — debatable; could rake)
  - Log to `game_history`, mark settled
- Safety timer (10 min absolute) → auto-refund both players if match never resolves (port hard2kill pattern)

### Seed data

- ~200 hand-picked Street View locations to start. World-coverage random as a stretch goal.
- A simple admin script to add new pano IDs to `geostakes_locations` (just paste pano_id + lat/lng).

**Demo:** run a script that creates two test users, creates a match between them, walks them through 5 rounds via API calls, and confirms the winner's balance went up by `$1.80` (90% of $2 pot, $1 bet each).

---

## Sprint 3 — Matchmaking + Realtime (~3 days)

**Goal:** Two browser windows can find each other in matchmaking, get paired, and receive realtime round-start events. No game UI yet — just events in the console.

### Matchmaking queue (DB-backed, not in-memory)

```sql
CREATE TABLE geostakes_queue (
  user_id uuid PRIMARY KEY,
  bet_amount numeric NOT NULL,
  currency text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);
```

- `POST /api/matchmaking/join` — insert into queue, then atomically pick the oldest waiting opponent at the same `(bet_amount, currency)` (use `SELECT … FOR UPDATE SKIP LOCKED` to avoid double-pairing). If found: delete both from queue, call `createMatch`, broadcast `match_found` to both via Realtime
- `POST /api/matchmaking/leave` — delete user from queue
- `POST /api/matchmaking/heartbeat` — refresh `joined_at` (so dead clients drop out after, say, 30s without heartbeat); a periodic cleanup function purges stale rows

### Supabase Realtime channels

- Channel-per-match: `match:<matchId>`
- Server broadcasts to it on every state transition: `match_started`, `round_started` (with round_number, pano_id, server_time), `opponent_guessed`, `round_ended` (with both guesses, both scores, both players' lat/lngs), `match_ended` (with winner, payout)
- Channel-per-queue: `queue:<userId>` (private). Server broadcasts `match_found` on pair
- Use Supabase Realtime **presence** on the match channel for disconnect detection. On presence-leave: start a 20s reconnect grace; if no rejoin → forfeit

**Demo:** open two browser tabs as two users, hit "find $1 match" in both, see them pair up, watch round-start events log to both consoles.

---

## Sprint 4 — Game UI (~3–4 days)

**Goal:** A real, playable match end-to-end. Click "find match" → pair up → 5 rounds of pano + minimap → results → payout reflected in balance.

### Pages

- `/` — landing: brand hero, "play now" CTA, sign-in
- `/play` — matchmaking modal: bet selector ($1 / $5 / $10), find match button, queue spinner
- `/match/[matchId]` — the actual match page:
  - Top: full-screen Google Street View pano (pano_id from server, no lat/lng exposed)
  - Bottom-right: minimap (Google Maps) for guess placement, "Submit guess" button
  - Top-right: 60s timer (driven from server `round_started_at`), opponent status indicator ("opponent has guessed" / "still guessing")
  - Top-left: round number indicator (1/5)
- `/match/[matchId]/round/[n]` (or modal) — round result: world map showing both guesses + truth, point totals, "next round in 5s" countdown
- `/match/[matchId]/result` — final result: total points each, winner banner, payout amount, "play again" button

### Components (write fresh in React; reference `geohub`'s for shape)

- `<StreetViewPano panoId="..." />` — wraps Google Maps JS `StreetViewPanorama`. Crucially: does NOT expose `getPosition()` to React state.
- `<GuessMap onSubmit={({lat, lng}) => …} />` — Google Maps minimap, click-to-place pin, submit button disabled until pin placed
- `<RoundTimer startedAt={ISO} durationSec={60} onExpire={…} />` — pure server-time-driven countdown (no client `setInterval` drift trust)
- `<RoundResult myGuess={…} opponentGuess={…} truth={…} myPoints={…} opponentPoints={…} />` — uses Google Maps with three pins + polylines
- `<MatchResultCard winner={…} payout={…} />` — final-result modal

### Frontend wiring

- Subscribe to `match:<matchId>` Realtime channel on match page
- Submit guess via `POST /api/match/<matchId>/guess`
- Render whichever screen the match-state row says to render (single source of truth = the DB)

**Demo:** play a $1 match against yourself in two tabs, watch the score tick up, see the winner's balance increase.

---

## Sprint 5 — Polish, error states, deploy (~2–3 days)

**Goal:** Stop being embarrassing. Production-ready enough for first user.

- Error states everywhere: failed deposit, network drop during match, opponent never accepts, Stripe webhook double-fire idempotency
- Mobile responsive (50%+ of TikTok traffic is mobile — non-negotiable)
- Loading skeletons (no flash of unstyled content)
- Friendly empty states for queue with no opponents (consider porting hard2kill's 5s bot fill — might be MVP-worth, might be v0.5)
- Insufficient-balance flow (deposit prompt inline)
- Sign-in error states (Google OAuth fail, magic link expired)
- Stripe live mode + production webhook
- Production Supabase keys, env separation
- Domain (geostakes.com or whatever) + Vercel production deploy
- One end-to-end smoke test by you, with $5 of real money

**Demo:** you can hand the URL to a stranger and they can sign up, deposit, play, and walk away with money (or not).

---

## Open questions surfacing during the build

These are not blockers for sprint 0, but you'll want to decide as you hit them:

1. **Movement rules** — moving / no-move / NMPZ? Defaults to "moving" if you don't pick. NMPZ is more skill-loaded (better wager signal-to-noise) but turns off casuals.
2. **Map difficulty curation** — start with a single "world random" pool of ~200 hand-picked panos? Or partition by difficulty for different bet tiers?
3. **Rake on forfeits** — full pot to non-forfeiter (current plan) vs. (pot − rake) to non-forfeiter. Affects unit economics on disconnect-prone mobile.
4. **Bot fill** — port hard2kill's 5s realistic-name bot fill to MVP, or skip for v0.5? Geostakes won't feel as dead as hard2kill at 0 DAU because matches are short — could go either way.
5. **Signup bonus amount + WR multiplier** — proposed $5 with 5x WR. Real iGaming defaults are 100% match deposit with 30x WR; we don't have to copy them.

---

## What's NOT in v1 (explicitly deferred)

- Anti-cheat (reverse-image-search, GeoSpy, dev-tools detection) — roadmap, not MVP
- Profiles, social, friends, leaderboards
- Tournaments / brackets
- Map-maker / community maps
- KYC / responsible-gaming gates beyond Stripe's defaults
- Mobile app (web is fine for v1)
- Withdrawals (deposits work via Stripe; withdrawals via Stripe Connect or manual ACH later — flag this for legal review before going live)

---

## Critical-path summary

Sprints 0–2 are independent of UI and can be brutally fast. Sprint 3 is where the real risk lives — Realtime + DB-backed matchmaking under racy conditions. Budget for that one to slip a day. Sprint 4 is mostly "wire components to APIs that already work" — the lowest-risk sprint. Sprint 5 is variable; depends on how clean 0–4 came out.

If anything blows up the timeline, the most likely culprit is **Sprint 3 race conditions** (two users grabbing the same opponent, double-paired matches, presence flapping causing false forfeits). Keep an eye on it.
