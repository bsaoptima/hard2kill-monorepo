-- Geostakes initial schema.
-- Adds geostakes_* tables to the shared hard2kill Supabase project.
-- Does not modify existing hard2kill tables (balances, transactions, game_history, profiles).

-- =========================================================================
-- Source pool of Street View locations.
-- pano_id is nullable because we resolve it server-side via the Google
-- Maps Street View Metadata API on first use, then cache it back here.
-- =========================================================================
create table public.geostakes_locations (
    id uuid primary key default gen_random_uuid(),
    pano_id text,
    lat double precision not null,
    lng double precision not null,
    heading double precision not null default 0,
    pitch double precision not null default 0,
    difficulty smallint not null default 3,
    label text unique,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

create index geostakes_locations_active_idx
    on public.geostakes_locations (active)
    where active;

-- =========================================================================
-- Match-level state.
-- One row per locked 1v1 wager. current_round = 1..5 while playing,
-- 6 = match ended. round_started_at is the server-authoritative anchor
-- for the 60s round timer.
-- =========================================================================
create table public.geostakes_matches (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'active',
    bet_amount numeric not null,
    currency text not null,
    player1_id uuid not null references auth.users(id),
    player2_id uuid not null references auth.users(id),
    current_round smallint not null default 1,
    round_started_at timestamptz not null default now(),
    winner_id uuid references auth.users(id),
    forfeit_reason text,
    created_at timestamptz not null default now(),
    ended_at timestamptz,

    constraint geostakes_matches_currency_chk
        check (currency in ('cash', 'coins')),
    constraint geostakes_matches_status_chk
        check (status in ('active', 'settled', 'refunded')),
    constraint geostakes_matches_round_chk
        check (current_round between 1 and 6),
    constraint geostakes_matches_distinct_players_chk
        check (player1_id <> player2_id)
);

create index geostakes_matches_active_p1_idx
    on public.geostakes_matches (player1_id)
    where status = 'active';

create index geostakes_matches_active_p2_idx
    on public.geostakes_matches (player2_id)
    where status = 'active';

-- =========================================================================
-- Locations pre-picked at match-create. Server-private:
-- never returned to client up-front. The match API drips one round's
-- pano_id at a time, only after that round starts.
-- =========================================================================
create table public.geostakes_match_locations (
    match_id uuid not null references public.geostakes_matches(id) on delete cascade,
    round_number smallint not null,
    location_id uuid not null references public.geostakes_locations(id),

    primary key (match_id, round_number),
    constraint geostakes_match_locations_round_chk
        check (round_number between 1 and 5)
);

-- =========================================================================
-- Per-round per-player guesses. distance + points are server-computed and
-- written by the API only (RLS denies direct client writes).
-- =========================================================================
create table public.geostakes_round_guesses (
    match_id uuid not null references public.geostakes_matches(id) on delete cascade,
    round_number smallint not null,
    player_id uuid not null references auth.users(id),
    guess_lat double precision,
    guess_lng double precision,
    distance_meters double precision,
    points integer,
    submitted_at timestamptz not null default now(),

    primary key (match_id, round_number, player_id),
    constraint geostakes_round_guesses_round_chk
        check (round_number between 1 and 5)
);

-- =========================================================================
-- Row Level Security
--
-- - geostakes_matches: players can SELECT their own matches (needed so the
--   client can subscribe to current_round / status / winner_id changes via
--   Supabase Realtime in a future stage).
-- - geostakes_round_guesses, geostakes_locations, geostakes_match_locations:
--   no policies = no client access. Server bypasses via service_role.
--   Anything the client needs to see (own guess after submit, opponent's
--   guess after round end) goes through an API route the server controls.
-- =========================================================================
alter table public.geostakes_locations enable row level security;
alter table public.geostakes_matches enable row level security;
alter table public.geostakes_match_locations enable row level security;
alter table public.geostakes_round_guesses enable row level security;

create policy "geostakes_matches: players read their own matches"
    on public.geostakes_matches
    for select
    to authenticated
    using (auth.uid() = player1_id or auth.uid() = player2_id);
