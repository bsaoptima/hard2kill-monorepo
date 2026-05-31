-- Deposit Bonus & Playthrough Tracking System
-- Created: 2026-05-31

-- ============================================================================
-- BONUS TRACKING TABLE
-- ============================================================================
-- Tracks which users have received deposit bonuses and prevents duplicate claims

CREATE TABLE IF NOT EXISTS geostakes_bonus_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  bonus_type TEXT NOT NULL, -- 'first_deposit_match', 'referral', etc.
  bonus_amount NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2), -- original deposit that triggered bonus
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_fingerprint TEXT, -- browser fingerprint for abuse detection
  ip_address TEXT,
  payment_method_id TEXT, -- stripe payment method id

  -- Prevent duplicate first deposit bonuses
  UNIQUE(user_id, bonus_type)
);

CREATE INDEX idx_bonus_claims_user ON geostakes_bonus_claims(user_id);
CREATE INDEX idx_bonus_claims_device ON geostakes_bonus_claims(device_fingerprint);
CREATE INDEX idx_bonus_claims_payment ON geostakes_bonus_claims(payment_method_id);

-- ============================================================================
-- PLAYTHROUGH TRACKING TABLE
-- ============================================================================
-- Tracks cumulative wagers for bonus playthrough requirements

CREATE TABLE IF NOT EXISTS geostakes_playthrough (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,

  -- Current bonus balance that requires playthrough
  bonus_balance NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Playthrough tracking
  playthrough_required NUMERIC(10,2) NOT NULL DEFAULT 0, -- total amount to wager (3x bonus)
  playthrough_completed NUMERIC(10,2) NOT NULL DEFAULT 0, -- amount wagered so far

  -- Metadata
  bonus_claimed_at TIMESTAMPTZ,
  bonus_expires_at TIMESTAMPTZ, -- bonuses expire after 30 days
  playthrough_completed_at TIMESTAMPTZ, -- when requirement was met

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playthrough_user ON geostakes_playthrough(user_id);
CREATE INDEX idx_playthrough_active ON geostakes_playthrough(user_id)
  WHERE bonus_balance > 0 AND playthrough_completed < playthrough_required;

-- ============================================================================
-- PLAYTHROUGH HISTORY TABLE
-- ============================================================================
-- Audit trail of all wagers that count toward playthrough

CREATE TABLE IF NOT EXISTS geostakes_playthrough_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- What action contributed to playthrough
  source_type TEXT NOT NULL, -- 'seed_play', 'match', 'tournament'
  source_id UUID NOT NULL, -- id of the seed/match/tournament

  -- Amount wagered
  wager_amount NUMERIC(10,2) NOT NULL,

  -- Balance used (cash vs bonus)
  cash_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_used NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playthrough_history_user ON geostakes_playthrough_history(user_id, created_at DESC);
CREATE INDEX idx_playthrough_history_source ON geostakes_playthrough_history(source_type, source_id);

-- ============================================================================
-- UPDATE balances TABLE
-- ============================================================================
-- Add bonus column if it doesn't exist (may already exist from hard2kill)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'balances' AND column_name = 'bonus'
  ) THEN
    ALTER TABLE balances ADD COLUMN bonus NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is eligible for first deposit bonus
CREATE OR REPLACE FUNCTION check_first_deposit_bonus_eligibility(
  p_user_id UUID,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_payment_method_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_already_claimed BOOLEAN;
  v_device_abuse BOOLEAN;
  v_payment_abuse BOOLEAN;
BEGIN
  -- Check if user already claimed
  SELECT EXISTS(
    SELECT 1 FROM geostakes_bonus_claims
    WHERE user_id = p_user_id AND bonus_type = 'first_deposit_match'
  ) INTO v_already_claimed;

  -- Check for device fingerprint abuse (same device, multiple bonuses)
  IF p_device_fingerprint IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM geostakes_bonus_claims
      WHERE device_fingerprint = p_device_fingerprint
        AND bonus_type = 'first_deposit_match'
        AND claimed_at > now() - INTERVAL '30 days'
    ) INTO v_device_abuse;
  ELSE
    v_device_abuse := FALSE;
  END IF;

  -- Check for payment method abuse (same card, multiple bonuses)
  IF p_payment_method_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM geostakes_bonus_claims
      WHERE payment_method_id = p_payment_method_id
        AND bonus_type = 'first_deposit_match'
        AND claimed_at > now() - INTERVAL '30 days'
    ) INTO v_payment_abuse;
  ELSE
    v_payment_abuse := FALSE;
  END IF;

  v_result := jsonb_build_object(
    'eligible', NOT (v_already_claimed OR v_device_abuse OR v_payment_abuse),
    'already_claimed', v_already_claimed,
    'device_abuse', v_device_abuse,
    'payment_abuse', v_payment_abuse
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get playthrough status for a user
CREATE OR REPLACE FUNCTION get_playthrough_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_status RECORD;
  v_result JSONB;
BEGIN
  SELECT
    bonus_balance,
    playthrough_required,
    playthrough_completed,
    (playthrough_completed >= playthrough_required) as is_complete,
    GREATEST(0, playthrough_required - playthrough_completed) as remaining,
    CASE
      WHEN playthrough_required > 0 THEN
        LEAST(100, (playthrough_completed / playthrough_required * 100))
      ELSE 100
    END as progress_percent,
    bonus_expires_at,
    (bonus_expires_at IS NOT NULL AND bonus_expires_at < now()) as is_expired
  FROM geostakes_playthrough
  WHERE user_id = p_user_id
  INTO v_status;

  -- If no record exists, user has no active bonus
  IF v_status IS NULL THEN
    v_result := jsonb_build_object(
      'has_bonus', FALSE,
      'can_withdraw', TRUE,
      'bonus_balance', 0,
      'playthrough_required', 0,
      'playthrough_completed', 0,
      'playthrough_remaining', 0,
      'progress_percent', 100,
      'is_complete', TRUE,
      'is_expired', FALSE
    );
  ELSE
    v_result := jsonb_build_object(
      'has_bonus', v_status.bonus_balance > 0,
      'can_withdraw', v_status.is_complete OR v_status.bonus_balance = 0,
      'bonus_balance', v_status.bonus_balance,
      'playthrough_required', v_status.playthrough_required,
      'playthrough_completed', v_status.playthrough_completed,
      'playthrough_remaining', v_status.remaining,
      'progress_percent', v_status.progress_percent,
      'is_complete', v_status.is_complete,
      'is_expired', v_status.is_expired,
      'expires_at', v_status.bonus_expires_at
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES (restrict direct access, force API usage)
-- ============================================================================

ALTER TABLE geostakes_bonus_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE geostakes_playthrough ENABLE ROW LEVEL SECURITY;
ALTER TABLE geostakes_playthrough_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own bonus/playthrough data
CREATE POLICY "Users can view own bonus claims"
  ON geostakes_bonus_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own playthrough"
  ON geostakes_playthrough FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own playthrough history"
  ON geostakes_playthrough_history FOR SELECT
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE from client (API only via service role)

COMMENT ON TABLE geostakes_bonus_claims IS 'Tracks deposit bonus claims and prevents abuse';
COMMENT ON TABLE geostakes_playthrough IS 'Tracks playthrough requirements for bonus withdrawals';
COMMENT ON TABLE geostakes_playthrough_history IS 'Audit trail of wagers contributing to playthrough';
