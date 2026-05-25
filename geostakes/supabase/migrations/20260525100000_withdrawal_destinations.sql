-- Extend withdrawal destination options.
--   - Narrow 'crypto' → 'crypto_usdc_base' (USDC on Base only, single-chain MVP)
--   - Add 'bank' (international SWIFT/IBAN transfers, processed manually via Wise)
--   - Add destination_details JSONB column for structured bank info
--     (holder name, IBAN, bank name, SWIFT/BIC). For PIX/crypto, single-value
--     destination_value is still enough; details column stays NULL.

-- Drop and recreate the destination_type check with the new values.
alter table public.withdrawals
    drop constraint if exists withdrawals_destination_type_chk;

-- Migrate any pre-existing 'crypto' rows to the more specific value.
update public.withdrawals
set destination_type = 'crypto_usdc_base'
where destination_type = 'crypto';

alter table public.withdrawals
    add constraint withdrawals_destination_type_chk
        check (destination_type in ('pix', 'crypto_usdc_base', 'bank'));

-- Structured details for bank transfers (and future destination types).
alter table public.withdrawals
    add column if not exists destination_details jsonb;
