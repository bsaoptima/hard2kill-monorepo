# Geostakes — Async Seed-Based Wagering Design

> Decided 2026-05-18. Replaces the locked-1v1-realtime spec from the MVP memo.

## What changed and why

Originally Geostakes was scoped as **realtime 1v1** (both players online, matched at start, single pot). That's wrong for our liquidity reality. At 20 DAU you cannot reliably get two GeoGuessr-wager players online at the same time.

New model: **async, seed-based, Triumph-style.** Player A plays a 5-round seed solo. Server holds the stake and the score. Later, Player B comes online, server matches them to A's open seed if they're in A's score-band. B plays the same 5 locations, score is compared, winner takes the pot (minus 10% rake).

This is the model that took Triumph from zero to $20M ARR. We're not inventing — we're porting.

## Anti-cheat (the three locks)

Going async creates one new attack: P1 plays, screenshots locations, looks them up, replays as P2 to win. Three locks close it for MVP:

1. **Same player can never play a seed twice.** Unique constraint on `(user_id, seed_id)` in plays table. Closes self-replay.
2. **60-second per-round hard timer, server-dripped locations.** No Google lookup window — too short for Street View pano lookup if you don't already recognize it. Skilled GeoGuessr players who ID from signs/vegetation are using *skill*, not cheating; we can't gate that.
3. **Score-band matching.** P1's seed only matches P2 candidates whose expected score is within a band of P1's actual score. A cheater scoring 24999 never gets matched to honest players — only other cheaters. House rake (10%) makes cheater-vs-cheater pots net negative for them.

**Deferred to post-MVP:** multi-account farming (alt accounts on same device/IP), professional GeoGuessr-level skill cheating (ML-assisted location ID). Log device fingerprint + IP now to enable later detection.

## Hybrid play flow (the UX decision)

When a player presses "Play" at tier $5:

```
1. Server queries open seeds at tier $5, in score-band, not played by this user, not created by this user.
2. If a match exists:
   → Player plays INTO that seed (instant resolution when they finish).
3. If no match:
   → Player opens a NEW seed (server holds their stake, waits for P2).
```

At 20 DAU most plays resolve as "join an open pot." New seeds only open when no compatible pot exists. This minimizes wait times in a thin market.

## Schema

Two new tables. Both live in the shared hard2kill Supabase project.

### `geostakes_seeds`

The open challenge pool. One row per "P1 played, looking for P2."

```sql
CREATE TYPE geostakes_seed_status AS ENUM ('open', 'matched', 'resolved', 'refunded');
CREATE TYPE geostakes_tier AS ENUM ('1', '5', '10');

CREATE TABLE geostakes_seeds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES auth.users(id),
  tier            geostakes_tier NOT NULL,
  stake_amount    INTEGER NOT NULL,  -- 1, 5, or 10 (in dollars or cents — pick one and document)
  location_ids    INTEGER[] NOT NULL,  -- the 5 location IDs from geostakes_locations
  creator_score   INTEGER NOT NULL,  -- P1's total score across 5 rounds
  status          geostakes_seed_status NOT NULL DEFAULT 'open',
  matched_user_id UUID REFERENCES auth.users(id),  -- P2, set when status -> matched
  winner_user_id  UUID REFERENCES auth.users(id),  -- set when status -> resolved
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_at      TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours')
);

CREATE INDEX idx_seeds_open_matching ON geostakes_seeds (tier, creator_score, created_at)
  WHERE status = 'open';
CREATE INDEX idx_seeds_expires ON geostakes_seeds (expires_at) WHERE status = 'open';
```

### `geostakes_seed_plays`

Individual play attempts. One row per (user, seed) — never two from the same player on the same seed.

```sql
CREATE TABLE geostakes_seed_plays (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id       UUID NOT NULL REFERENCES geostakes_seeds(id),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  role          TEXT NOT NULL CHECK (role IN ('creator', 'challenger')),
  score         INTEGER,  -- null while in-progress, set on completion
  round_scores  JSONB,    -- [{round, score, distance_m, time_ms, guess_lat, guess_lng}, ...]
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, seed_id)  -- the same-player-once lock
);

CREATE INDEX idx_plays_seed ON geostakes_seed_plays (seed_id);
CREATE INDEX idx_plays_user ON geostakes_seed_plays (user_id, completed_at DESC);
```

## State transitions

```
                  P1 plays                 P2 matched + plays
   (nothing) ────────────────► open ─────────────────────────► matched
                                 │                                │
                                 │ 48h timeout                    │ P2 completes
                                 ▼                                ▼
                              refunded                         resolved
                                                                  │
                                                                  └── winner credited, rake to house
```

All transitions are server-authoritative. P2 cannot self-resolve. The match-stake and resolve operations live in a single transaction that touches `balances`, `transactions`, `geostakes_seeds`, and `geostakes_seed_plays`.

## Score-band matching query

When a player at tier $5 hits "Play," server runs:

```sql
WITH user_expected_score AS (
  -- Median of last 20 completed plays, or platform-wide median for cold-start users
  SELECT COALESCE(
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score)
      FILTER (WHERE user_id = $1 AND completed_at IS NOT NULL),
    (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score)
       FROM geostakes_seed_plays WHERE completed_at IS NOT NULL)
  ) AS expected
  FROM geostakes_seed_plays
  LIMIT 1
)
SELECT s.*
FROM geostakes_seeds s, user_expected_score u
WHERE s.status = 'open'
  AND s.tier = '5'
  AND s.creator_user_id != $1
  AND s.id NOT IN (SELECT seed_id FROM geostakes_seed_plays WHERE user_id = $1)
  AND s.creator_score BETWEEN (u.expected - $2) AND (u.expected + $2)  -- $2 is band width
ORDER BY s.created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**Band widths:**
- New user (<3 completed plays): `band = 8000` (wide — let them play)
- Established: `band = 2500` (tight — keeps cheaters quarantined)

`FOR UPDATE SKIP LOCKED` is critical — prevents two challengers grabbing the same seed in a race.

## Stake + refund flow

| Event | Balance op | Seed status |
|---|---|---|
| P1 opens new seed | Deduct `stake_amount` from P1 (cash first, bonus second per [[free-balance-exploit]]) | open |
| P2 joins existing seed | Deduct `stake_amount` from P2 | open → matched |
| P2 completes, P2 wins | Credit P2 with `2 × stake × 0.9`, log rake | matched → resolved |
| P2 completes, P1 wins | Credit P1 with `2 × stake × 0.9`, log rake | matched → resolved |
| Tie | Refund both | matched → resolved (winner_user_id = null) |
| 48h timeout, no P2 | Refund P1 stake | open → refunded |
| P2 abandons mid-match (no completion in 10 min) | Refund P2; seed back to open | matched → open |

## Timeout cron

Edge function or pg_cron, runs every 15 minutes:

```sql
WITH expired AS (
  SELECT id, creator_user_id, stake_amount
  FROM geostakes_seeds
  WHERE status = 'open' AND expires_at < now()
  FOR UPDATE SKIP LOCKED
)
UPDATE geostakes_seeds SET status = 'refunded' WHERE id IN (SELECT id FROM expired);
-- + credit each creator's balance, log refund transaction
```

Plus a separate sweep for abandoned matches (`status = 'matched' AND matched_at < now() - INTERVAL '10 minutes' AND challenger play has no completed_at`).

## What this kills from the old spec

- **Supabase Realtime** is no longer needed for matchmaking. Async play = stateless API endpoints. Realtime stays only for "your seed got matched, result is X" notifications — and even that can be polling or push, not subscriptions. Simplifies the stack.
- **5-second bot fill** memory is obsolete for Geostakes (still applies to CS).
- **Forfeit-on-disconnect** is replaced by 10-minute abandoned-match sweep.

## What stays from the old spec

- 5 rounds × 60 seconds each
- $1 / $5 / $10 tiers
- 10% house rake
- Server-dripped locations (now even more important — see anti-cheat)
- Bonus balance + WR (still required, deducts cash first)
- Shared Supabase project with hard2kill (same auth, same wallet)
- Greenfield Next.js (no fork of geohub or geoguess-lite)
- Location pool urgency: expand from 30 hand-picked iconic cities to hundreds of less-recognizable streets. Async makes repeat-seed exposure worse — same seed can show up to many P2s over its 48h window.

## Open questions

- **Location pool size for MVP launch.** 30 isn't enough for async — a frequent player will see the same locations repeatedly within a week. Stretch goal: 500+ locations before public launch. Acceptable for closed beta: 100.
- **Score-band tuning.** Band of 2500 is a guess. After 2 weeks of data, calibrate from cheater detection rate.
- **Tier mixing.** Should a $1 player be able to play *into* a $5 seed at a $1 stake (asymmetric pot)? Probably no for MVP — same tier only. Worth revisiting.
- **Notifications.** When P1's seed is matched and resolved, how does P1 learn? Email + in-app badge for MVP. Push notifications later.
