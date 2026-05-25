-- Atomic seed resolution + transaction audit trail.
--
-- Three changes:
--   1. Extend public.transactions.type check to include 'refund'.
--   2. resolve_geostakes_seed(seed_id) — runs the entire resolve flow
--      (credit winner / log tx / log history / update seed status) inside
--      a single transaction. Either all changes commit or none do.
--   3. Row-level lock via SELECT FOR UPDATE prevents two concurrent
--      resolves from racing on the same seed.

-- 1) Allow 'refund' in transactions.type ------------------------------------
alter table public.transactions
    drop constraint if exists transactions_type_check;
alter table public.transactions
    drop constraint if exists transactions_type_chk;
alter table public.transactions
    add constraint transactions_type_chk
        check (type in ('deposit', 'withdraw', 'bet', 'win', 'refund'));

-- 2) Atomic resolve --------------------------------------------------------
create or replace function public.resolve_geostakes_seed(p_seed_id uuid)
returns uuid -- winner_user_id, or NULL on tie / no-op
language plpgsql
security definer
as $$
declare
    v_house_rake constant numeric := 0.10;
    v_seed record;
    v_creator_play record;
    v_challenger_play record;
    v_pot numeric;
    v_payout numeric;
    v_winner_id uuid;
    v_loser_id uuid;
begin
    -- Lock the seed row so a concurrent call to this function bails out.
    select * into v_seed
    from public.geostakes_seeds
    where id = p_seed_id and status = 'matched'
    for update;

    if not found then
        return null; -- already resolved, refunded, or no longer matched
    end if;

    select * into v_creator_play
    from public.geostakes_seed_plays
    where seed_id = p_seed_id and role = 'creator'
    limit 1;

    select * into v_challenger_play
    from public.geostakes_seed_plays
    where seed_id = p_seed_id and role = 'challenger'
    limit 1;

    if v_creator_play is null or v_challenger_play is null then
        return null;
    end if;
    if v_creator_play.total_score is null
       or v_challenger_play.total_score is null then
        return null;
    end if;

    v_pot := v_seed.bet_amount * 2;
    v_payout := round((v_pot * (1 - v_house_rake))::numeric, 2);

    if v_creator_play.total_score > v_challenger_play.total_score then
        v_winner_id := v_creator_play.user_id;
        v_loser_id := v_challenger_play.user_id;
    elsif v_challenger_play.total_score > v_creator_play.total_score then
        v_winner_id := v_challenger_play.user_id;
        v_loser_id := v_creator_play.user_id;
    end if;

    if v_winner_id is not null then
        -- Credit winner. Use update + insert-fallback so it works even when
        -- the balances row doesn't exist yet for some reason.
        update public.balances
        set balance = balance + v_payout
        where id = v_winner_id;
        if not found then
            insert into public.balances (id, balance) values (v_winner_id, v_payout);
        end if;

        insert into public.transactions (user_id, amount, type)
        values (v_winner_id, v_payout, 'win');

        insert into public.game_history
            (winner_id, loser_id, amount, currency, game, started_at, ended_at)
        values
            (v_winner_id, v_loser_id, v_payout, v_seed.currency, 'geostakes',
             v_seed.created_at, now());
    else
        -- Tie: refund both stakes, no rake.
        update public.balances
        set balance = balance + v_seed.bet_amount
        where id = v_creator_play.user_id;
        if not found then
            insert into public.balances (id, balance)
            values (v_creator_play.user_id, v_seed.bet_amount);
        end if;

        update public.balances
        set balance = balance + v_seed.bet_amount
        where id = v_challenger_play.user_id;
        if not found then
            insert into public.balances (id, balance)
            values (v_challenger_play.user_id, v_seed.bet_amount);
        end if;

        insert into public.transactions (user_id, amount, type)
        values
            (v_creator_play.user_id, v_seed.bet_amount, 'refund'),
            (v_challenger_play.user_id, v_seed.bet_amount, 'refund');
    end if;

    update public.geostakes_seeds
    set status = 'resolved',
        winner_user_id = v_winner_id,
        resolved_at = now()
    where id = p_seed_id;

    return v_winner_id;
end;
$$;
