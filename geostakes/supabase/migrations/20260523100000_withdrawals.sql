-- Withdrawals — user-requested payouts from their balance.
--
-- MVP design: requests land in `pending`. The admin (Stefan) gets an email,
-- manually sends the money via Wise / PIX / USDC, then flips status to
-- `completed`. Balance is debited at request time so users can't double-spend
-- while a request is pending.
--
-- Statuses:
--   pending     – request created, balance debited, awaiting admin action
--   completed   – admin sent the money, transaction finalised
--   rejected    – admin rejected, balance refunded to user
--   failed      – payout attempt failed (kept as a state for future automation)

create table public.withdrawals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete restrict,
    amount numeric not null,
    destination_type text not null,
    destination_value text not null,
    status text not null default 'pending',
    notes text,
    created_at timestamptz not null default now(),
    processed_at timestamptz,

    constraint withdrawals_amount_chk check (amount > 0),
    constraint withdrawals_destination_type_chk
        check (destination_type in ('pix', 'crypto')),
    constraint withdrawals_status_chk
        check (status in ('pending', 'completed', 'rejected', 'failed'))
);

create index withdrawals_user_created_idx
    on public.withdrawals (user_id, created_at desc);

create index withdrawals_pending_idx
    on public.withdrawals (created_at)
    where status = 'pending';

-- RLS — users see only their own withdrawals. Admin uses service-role.
alter table public.withdrawals enable row level security;

create policy "withdrawals: read own"
    on public.withdrawals
    for select
    to authenticated
    using (auth.uid() = user_id);
