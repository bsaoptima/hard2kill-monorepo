-- Add columns for instant crypto withdrawals
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Index for daily limit queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_created
ON withdrawals (user_id, created_at DESC);

-- Index for destination type filtering
CREATE INDEX IF NOT EXISTS idx_withdrawals_destination_type
ON withdrawals (destination_type);

-- Comment
COMMENT ON COLUMN withdrawals.tx_hash IS 'On-chain transaction hash for crypto withdrawals';
COMMENT ON COLUMN withdrawals.status IS 'pending, completed, failed, cancelled';
