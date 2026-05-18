-- Stage 4: Supabase Realtime wiring.
-- Adds updated_at column on geostakes_matches that bumps on every relevant
-- mutation (direct UPDATE OR a guess insert via trigger), and includes the
-- table in the supabase_realtime publication so postgres_changes events
-- flow to subscribed clients. With this in place, both players' clients
-- get a Realtime UPDATE notification on every state transition without
-- polling.

alter table public.geostakes_matches
    add column updated_at timestamptz not null default now();

create or replace function public.geostakes_matches_bump_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger geostakes_matches_updated_at
    before update on public.geostakes_matches
    for each row
    execute function public.geostakes_matches_bump_updated_at();

-- When a round guess is inserted into geostakes_round_guesses, touch
-- the parent match row so Realtime fires for subscribers.
-- security definer so the trigger has rights to update geostakes_matches
-- regardless of who's inserting (the API uses service_role anyway, but
-- safe to be explicit).
create or replace function public.geostakes_match_touch_on_guess()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.geostakes_matches
        set updated_at = now()
        where id = new.match_id;
    return new;
end;
$$;

create trigger geostakes_match_touch_on_guess
    after insert on public.geostakes_round_guesses
    for each row
    execute function public.geostakes_match_touch_on_guess();

-- Enable Realtime broadcasts for geostakes_matches.
-- The default supabase_realtime publication ships with the project.
alter publication supabase_realtime add table public.geostakes_matches;
