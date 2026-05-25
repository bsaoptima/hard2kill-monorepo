-- Deactivate the score-band matching gate in find_geostakes_match.
--
-- Reasoning: at 0-100 DAU there isn't enough play history for the median
-- calculation to be statistically meaningful, and every match falls back
-- to the platform default (~12500 ± 5000) — which matches ~everyone honest
-- anyway. The gate adds complexity without protection at our current stage.
--
-- All the median-computation code is kept intact below; only the WHERE
-- predicate is bypassed. To reactivate score-band quarantine later:
--   - change `v_band` from 1000000 back to 5000 (or tighter, e.g. 2500)
--   - that's it. No other changes required.

create or replace function public.find_geostakes_match(
    p_user_id uuid,
    p_bet_amount numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
    -- DISABLED 2026-05-22: set to 1_000_000 to effectively turn off the
    -- score-band gate. Restore to 5000 (or tighter) when there's enough
    -- play history (≥500 completed plays) and active cheater pressure.
    v_band integer := 1000000;
    v_user_median integer;
    v_platform_median integer;
    v_target integer;
    v_seed_id uuid;
begin
    -- User's median from last 20 completed plays (kept for re-activation).
    select percentile_cont(0.5) within group (order by total_score)::int
    into v_user_median
    from (
        select total_score from public.geostakes_seed_plays
        where user_id = p_user_id and completed_at is not null
        order by completed_at desc limit 20
    ) recent
    having count(*) >= 3;

    -- Platform median as fallback (kept for re-activation).
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
      -- Score-band predicate. With v_band = 1000000 this is effectively
      -- "always true" because scores are capped at 25000 per round * 5 rounds
      -- = 125000 max. Toggle to ±5000 by setting v_band above.
      and creator_score between (v_target - v_band) and (v_target + v_band)
    order by created_at asc
    limit 1
    for update skip locked;

    return v_seed_id;
end;
$$;
