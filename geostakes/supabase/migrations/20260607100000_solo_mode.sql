-- Solo mode: bet multiplier system based on distance accuracy
-- Players bet per round, play unlimited rounds until they've seen all locations

-- Track each solo round played
create table if not exists public.geostakes_solo_rounds (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    location_id uuid not null references public.geostakes_locations(id),
    stake numeric not null check (stake > 0),
    guess_lat numeric not null,
    guess_lng numeric not null,
    distance_km numeric not null,
    multiplier numeric not null check (multiplier >= 0),
    payout numeric not null,
    created_at timestamptz not null default now()
);

-- Track which locations each user has played (forever - never repeat)
create table if not exists public.geostakes_solo_played_locations (
    user_id uuid not null references auth.users(id) on delete cascade,
    location_id uuid not null references public.geostakes_locations(id),
    played_at timestamptz not null default now(),
    primary key (user_id, location_id)
);

-- Indexes for performance
create index if not exists idx_solo_rounds_user_created
    on public.geostakes_solo_rounds(user_id, created_at desc);

create index if not exists idx_solo_played_locations_user
    on public.geostakes_solo_played_locations(user_id);

-- RLS policies
alter table public.geostakes_solo_rounds enable row level security;
alter table public.geostakes_solo_played_locations enable row level security;

-- Users can read their own solo rounds
create policy "Users can read own solo rounds"
    on public.geostakes_solo_rounds
    for select
    using (auth.uid() = user_id);

-- Users can read their own played locations
create policy "Users can read own played locations"
    on public.geostakes_solo_played_locations
    for select
    using (auth.uid() = user_id);

-- Service role can insert (via API endpoints)
create policy "Service role can insert solo rounds"
    on public.geostakes_solo_rounds
    for insert
    with check (true);

create policy "Service role can insert played locations"
    on public.geostakes_solo_played_locations
    for insert
    with check (true);
