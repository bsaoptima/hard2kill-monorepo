-- Geostakes async seed-based wagering schema.
-- Replaces realtime 1v1 model. Old geostakes_matches tables remain for
-- now (cutover happens once the new flow is live in the UI).
-- See coworker/engineering/geostakes/ASYNC_DESIGN.md for the full design.

-- =========================================================================
-- geostakes_seeds: the wagering challenge.
--
-- Lifecycle:
--   1. P1 hits Play → row created with status='open', expires_at=now()+10min
--      (P1 has 10 minutes to complete their own 5 rounds).
--   2. P1 completes 5 rounds → creator_score set, expires_at bumped to
--      now()+48h. Seed is now in the open-pool, eligible to match a P2.
--   3. P2 hits Play and gets matched into this seed → status='matched',
--      matched_user_id=P2, expires_at=now()+10min.
--   4. P2 completes 5 rounds → status='resolved', winner_user_id set,
--      balances credited.
--
-- Timeout/refund paths:
--   - status='open' + creator_score IS NULL + expires_at < now() → P1
--     abandoned mid-play; refund P1, mark 'refunded'.
--   - status='open' + creator_score IS NOT NULL + expires_at < now() → no
--     P2 found in 48h; refund P1, mark 'refunded'.
--   - status='matched' + expires_at < now() → P2 abandoned mid-play;
--     refund P2 and roll seed back to 'open' (P1's stake still in play).
-- =========================================================================
create table public.geostakes_seeds (
    id uuid primary key default gen_random_uuid(),
    creator_user_id uuid not null references auth.users(id),
    bet_amount numeric not null,
    currency text not null default 'cash',
    location_ids uuid[] not null,
    status text not null default 'open',
    creator_score integer,
    matched_user_id uuid references auth.users(id),
    winner_user_id uuid references auth.users(id),
    created_at timestamptz not null default now(),
    creator_completed_at timestamptz,
    matched_at timestamptz,
    resolved_at timestamptz,
    expires_at timestamptz not null default (now() + interval '10 minutes'),

    constraint geostakes_seeds_currency_chk
        check (currency = 'cash'),
    constraint geostakes_seeds_bet_amount_chk
        check (bet_amount in (1, 5, 10)),
    constraint geostakes_seeds_status_chk
        check (status in ('open', 'matched', 'resolved', 'refunded')),
    constraint geostakes_seeds_distinct_players_chk
        check (matched_user_id is null or creator_user_id <> matched_user_id),
    constraint geostakes_seeds_location_count_chk
        check (array_length(location_ids, 1) = 5)
);

-- Score-band matching lookup: open seeds with completed creator score,
-- at a given bet tier, ordered by oldest first.
create index geostakes_seeds_matchable_idx
    on public.geostakes_seeds (bet_amount, creator_score, created_at)
    where status = 'open' and creator_score is not null;

-- Timeout sweep lookup
create index geostakes_seeds_expiring_idx
    on public.geostakes_seeds (expires_at)
    where status in ('open', 'matched');

-- =========================================================================
-- geostakes_seed_plays: one row per (user, seed).
-- The same-player-once unique constraint is the first anti-cheat lock —
-- prevents a player from replaying their own seed after seeing locations.
-- =========================================================================
create table public.geostakes_seed_plays (
    id uuid primary key default gen_random_uuid(),
    seed_id uuid not null references public.geostakes_seeds(id) on delete cascade,
    user_id uuid not null references auth.users(id),
    role text not null,
    current_round smallint not null default 1,
    round_started_at timestamptz not null default now(),
    total_score integer,
    started_at timestamptz not null default now(),
    completed_at timestamptz,

    constraint geostakes_seed_plays_role_chk
        check (role in ('creator', 'challenger')),
    constraint geostakes_seed_plays_round_chk
        check (current_round between 1 and 6),
    constraint geostakes_seed_plays_unique_user_seed
        unique (user_id, seed_id)
);

create index geostakes_seed_plays_seed_idx
    on public.geostakes_seed_plays (seed_id);

create index geostakes_seed_plays_user_completed_idx
    on public.geostakes_seed_plays (user_id, completed_at desc)
    where completed_at is not null;

-- =========================================================================
-- geostakes_seed_play_guesses: per-round guess for a single play.
-- Server-computed (distance, points) — RLS denies client writes.
-- =========================================================================
create table public.geostakes_seed_play_guesses (
    play_id uuid not null references public.geostakes_seed_plays(id) on delete cascade,
    round_number smallint not null,
    guess_lat double precision,
    guess_lng double precision,
    distance_meters double precision,
    points integer,
    submitted_at timestamptz not null default now(),

    primary key (play_id, round_number),
    constraint geostakes_seed_play_guesses_round_chk
        check (round_number between 1 and 5)
);

-- =========================================================================
-- Row Level Security
--
-- - geostakes_seeds: a player can read seeds they're part of (creator or
--   matched). Open seeds are NOT visible to other players directly —
--   matching happens server-side via service_role.
-- - geostakes_seed_plays: a player can read their own plays.
-- - geostakes_seed_play_guesses: no client policy. Server only.
-- =========================================================================
alter table public.geostakes_seeds enable row level security;
alter table public.geostakes_seed_plays enable row level security;
alter table public.geostakes_seed_play_guesses enable row level security;

create policy "geostakes_seeds: read own"
    on public.geostakes_seeds
    for select
    to authenticated
    using (auth.uid() = creator_user_id or auth.uid() = matched_user_id);

create policy "geostakes_seed_plays: read own"
    on public.geostakes_seed_plays
    for select
    to authenticated
    using (auth.uid() = user_id);

-- =========================================================================
-- find_geostakes_match: atomic find-and-lock of an open seed for a player.
--
-- Returns NULL if no compatible seed exists. Caller (server with
-- service_role) should then open a new seed and have the player create it.
--
-- The FOR UPDATE SKIP LOCKED protects against two concurrent challengers
-- grabbing the same seed in a race.
--
-- Score-band rules (anti-cheat lock #3):
--   - User median computed from their last 20 completed plays.
--   - Falls back to platform median, then to 12500 (mid of 0..25000) if
--     no plays exist yet.
--   - Band = ±5000 for MVP. Tighten to ±2500 once we have data.
-- =========================================================================
create or replace function public.find_geostakes_match(
    p_user_id uuid,
    p_bet_amount numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_band integer := 5000;
    v_user_median integer;
    v_platform_median integer;
    v_target integer;
    v_seed_id uuid;
begin
    -- User's median from last 20 completed plays (NULL if <3).
    select percentile_cont(0.5) within group (order by total_score)::int
    into v_user_median
    from (
        select total_score from public.geostakes_seed_plays
        where user_id = p_user_id and completed_at is not null
        order by completed_at desc limit 20
    ) recent
    having count(*) >= 3;

    -- Platform median as fallback.
    select percentile_cont(0.5) within group (order by total_score)::int
    into v_platform_median
    from public.geostakes_seed_plays
    where completed_at is not null;

    v_target := coalesce(v_user_median, v_platform_median, 12500);

    select id into v_seed_id
    from public.geostakes_seeds
    where status = 'open'
      and creator_score is not null
      and bet_amount = p_bet_amount
      and creator_user_id <> p_user_id
      and not exists (
          select 1 from public.geostakes_seed_plays
          where user_id = p_user_id and seed_id = public.geostakes_seeds.id
      )
      and creator_score between (v_target - v_band) and (v_target + v_band)
    order by created_at asc
    limit 1
    for update skip locked;

    return v_seed_id;
end;
$$;
