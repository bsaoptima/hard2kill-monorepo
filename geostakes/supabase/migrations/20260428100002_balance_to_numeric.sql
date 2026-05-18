-- Widen balances.balance from integer to numeric so fractional payouts
-- (e.g. Geostakes' $1 bet × 2 × 0.9 rake = $1.80) can be stored.
-- Backward-compatible: existing integer values are preserved; integer
-- writes from hard2kill's CS16 path continue to work unchanged.

alter table public.balances
    alter column balance type numeric
    using balance::numeric;
