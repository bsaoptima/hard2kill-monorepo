-- Create balances table for Geostakes
-- This table is shared with the main hard2kill project but needs to exist
-- in the geostakes Supabase instance as well

create table if not exists public.balances (
    id uuid primary key references auth.users(id) on delete cascade,
    balance numeric not null default 0,
    bonus numeric not null default 0,
    coins integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index for quick balance lookups
create index if not exists balances_id_idx on public.balances(id);

-- RLS policies
alter table public.balances enable row level security;

create policy "Users can read own balance"
    on public.balances
    for select
    using (auth.uid() = id);

-- Service role can do everything (for API operations)
create policy "Service role can manage balances"
    on public.balances
    for all
    using (true)
    with check (true);

-- Create transactions table for transaction history
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    amount numeric not null,
    type text not null,
    metadata jsonb,
    created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions(user_id, created_at desc);

alter table public.transactions enable row level security;

create policy "Users can read own transactions"
    on public.transactions
    for select
    using (auth.uid() = user_id);

-- Create game_history table for completed games
create table if not exists public.game_history (
    id uuid primary key default gen_random_uuid(),
    game_type text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    opponent_id uuid references auth.users(id) on delete cascade,
    stake numeric not null,
    result text not null, -- 'win', 'loss', 'tie', 'refund'
    payout numeric not null default 0,
    metadata jsonb,
    created_at timestamptz not null default now()
);

create index if not exists game_history_user_id_idx on public.game_history(user_id, created_at desc);

alter table public.game_history enable row level security;

create policy "Users can read own game history"
    on public.game_history
    for select
    using (auth.uid() = user_id or auth.uid() = opponent_id);
