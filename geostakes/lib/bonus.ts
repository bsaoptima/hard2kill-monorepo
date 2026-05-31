/**
 * Bonus Management System
 * Handles deposit match bonuses, playthrough tracking, and forfeit logic
 */

import { createAdminClient } from './supabase/admin'
import { recordTransaction } from './balance'

const supabase = createAdminClient()

// ============================================================================
// TYPES
// ============================================================================

export type BonusType = 'first_deposit_match' | 'referral' | 'promotion'

export interface BonusEligibility {
  eligible: boolean
  already_claimed: boolean
  device_abuse: boolean
  payment_abuse: boolean
}

export interface PlaythroughStatus {
  has_bonus: boolean
  can_withdraw: boolean
  bonus_balance: number
  playthrough_required: number
  playthrough_completed: number
  playthrough_remaining: number
  progress_percent: number
  is_complete: boolean
  is_expired: boolean
  expires_at?: string
}

export interface BonusClaimResult {
  success: boolean
  bonus_amount: number
  playthrough_required: number
  error?: string
}

// ============================================================================
// ELIGIBILITY CHECKING
// ============================================================================

/**
 * Check if user is eligible for first deposit bonus
 */
export async function checkFirstDepositEligibility(
  userId: string,
  deviceFingerprint?: string,
  paymentMethodId?: string
): Promise<BonusEligibility> {
  const { data, error } = await supabase.rpc('check_first_deposit_bonus_eligibility', {
    p_user_id: userId,
    p_device_fingerprint: deviceFingerprint || null,
    p_payment_method_id: paymentMethodId || null
  })

  if (error) {
    console.error('Error checking bonus eligibility:', error)
    return {
      eligible: false,
      already_claimed: true,
      device_abuse: false,
      payment_abuse: false
    }
  }

  return data as BonusEligibility
}

/**
 * Calculate bonus amount for a deposit (100% match, max $10)
 */
export function calculateDepositBonus(depositAmount: number): number {
  const MAX_BONUS = 10
  const MATCH_PERCENT = 1.0 // 100% match

  const bonusAmount = depositAmount * MATCH_PERCENT
  return Math.min(bonusAmount, MAX_BONUS)
}

// ============================================================================
// BONUS CREDITING
// ============================================================================

/**
 * Credit first deposit match bonus to user
 */
export async function creditFirstDepositBonus(
  userId: string,
  depositAmount: number,
  deviceFingerprint?: string,
  ipAddress?: string,
  paymentMethodId?: string
): Promise<BonusClaimResult> {
  // Check eligibility
  const eligibility = await checkFirstDepositEligibility(
    userId,
    deviceFingerprint,
    paymentMethodId
  )

  if (!eligibility.eligible) {
    return {
      success: false,
      bonus_amount: 0,
      playthrough_required: 0,
      error: eligibility.already_claimed
        ? 'First deposit bonus already claimed'
        : 'Not eligible for bonus (abuse detection)'
    }
  }

  // Calculate bonus amount
  const bonusAmount = calculateDepositBonus(depositAmount)

  if (bonusAmount === 0) {
    return {
      success: false,
      bonus_amount: 0,
      playthrough_required: 0,
      error: 'Deposit too small for bonus'
    }
  }

  // Calculate playthrough requirement (3x bonus)
  const playthroughRequired = bonusAmount * 3

  try {
    // 1. Get current bonus balance
    const { data: currentBalance, error: getError } = await supabase
      .from('balances')
      .select('bonus')
      .eq('id', userId)
      .single()

    if (getError) throw getError

    const currentBonus = parseFloat(currentBalance?.bonus?.toString() || '0')

    // 2. Add bonus to balance
    const { error: balanceError } = await supabase
      .from('balances')
      .update({
        bonus: currentBonus + bonusAmount
      })
      .eq('id', userId)

    if (balanceError) throw balanceError

    // 3. Record bonus claim
    const { error: claimError } = await supabase
      .from('geostakes_bonus_claims')
      .insert({
        user_id: userId,
        bonus_type: 'first_deposit_match',
        bonus_amount: bonusAmount,
        deposit_amount: depositAmount,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        payment_method_id: paymentMethodId
      })

    if (claimError) throw claimError

    // 4. Create/update playthrough tracking
    const { error: playthroughError } = await supabase
      .from('geostakes_playthrough')
      .upsert({
        user_id: userId,
        bonus_balance: bonusAmount,
        playthrough_required: playthroughRequired,
        playthrough_completed: 0,
        bonus_claimed_at: new Date().toISOString(),
        bonus_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })

    if (playthroughError) throw playthroughError

    // 5. Record transaction
    await recordTransaction(userId, bonusAmount, 'deposit_bonus_credit', {
      bonus_type: 'first_deposit_match',
      deposit_amount: depositAmount,
      playthrough_required: playthroughRequired
    })

    return {
      success: true,
      bonus_amount: bonusAmount,
      playthrough_required: playthroughRequired
    }
  } catch (error) {
    console.error('Error crediting deposit bonus:', error)

    return {
      success: false,
      bonus_amount: 0,
      playthrough_required: 0,
      error: 'Failed to credit bonus'
    }
  }
}

// ============================================================================
// PLAYTHROUGH TRACKING
// ============================================================================

/**
 * Get current playthrough status for user
 */
export async function getPlaythroughStatus(userId: string): Promise<PlaythroughStatus | null> {
  const { data, error } = await supabase.rpc('get_playthrough_status', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error getting playthrough status:', error)
    return null
  }

  return data as PlaythroughStatus
}

/**
 * Track a wager toward playthrough requirement
 * Called automatically when user plays a match
 */
export async function trackPlaythroughWager(
  userId: string,
  wagerAmount: number,
  cashUsed: number,
  bonusUsed: number,
  sourceType: 'seed_play' | 'match' | 'tournament',
  sourceId: string
): Promise<void> {
  try {
    // 1. Record in playthrough history
    await supabase.from('geostakes_playthrough_history').insert({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      wager_amount: wagerAmount,
      cash_used: cashUsed,
      bonus_used: bonusUsed
    })

    // 2. Get current playthrough and update
    const { data: currentPlaythrough } = await supabase
      .from('geostakes_playthrough')
      .select('playthrough_completed')
      .eq('user_id', userId)
      .single()

    if (currentPlaythrough) {
      const newCompleted = parseFloat(currentPlaythrough.playthrough_completed?.toString() || '0') + wagerAmount

      const { error: updateError } = await supabase
        .from('geostakes_playthrough')
        .update({
          playthrough_completed: newCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) throw updateError
    }

    // 3. Check if playthrough is now complete
    const status = await getPlaythroughStatus(userId)
    if (status?.is_complete && !status.is_expired) {
      // Mark completion timestamp
      await supabase
        .from('geostakes_playthrough')
        .update({
          playthrough_completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .is('playthrough_completed_at', null)
    }
  } catch (error) {
    console.error('Error tracking playthrough wager:', error)
    // Don't throw - playthrough tracking failure shouldn't break match play
  }
}

// ============================================================================
// WITHDRAWAL VALIDATION
// ============================================================================

/**
 * Check if user can withdraw (playthrough complete or no bonus)
 */
export async function canWithdraw(userId: string): Promise<{
  allowed: boolean
  reason?: string
  playthrough_status?: PlaythroughStatus
}> {
  const status = await getPlaythroughStatus(userId)

  if (!status) {
    return { allowed: true }
  }

  // No active bonus = can withdraw
  if (!status.has_bonus || status.bonus_balance === 0) {
    return { allowed: true }
  }

  // Bonus expired = can withdraw (bonus forfeited automatically)
  if (status.is_expired) {
    return { allowed: true }
  }

  // Playthrough complete = can withdraw
  if (status.is_complete) {
    return { allowed: true }
  }

  // Playthrough incomplete = cannot withdraw
  return {
    allowed: false,
    reason: 'playthrough_incomplete',
    playthrough_status: status
  }
}

// ============================================================================
// BONUS FORFEITURE
// ============================================================================

/**
 * Forfeit all bonus balance to unlock immediate withdrawal
 */
export async function forfeitBonus(userId: string): Promise<{
  success: boolean
  bonus_forfeited: number
  withdrawable_balance: number
  error?: string
}> {
  try {
    // Get current balances
    const { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('cash, bonus')
      .eq('id', userId)
      .single()

    if (balanceError || !balance) {
      throw new Error('Failed to get balance')
    }

    const bonusAmount = parseFloat(balance.bonus.toString())

    if (bonusAmount === 0) {
      return {
        success: false,
        bonus_forfeited: 0,
        withdrawable_balance: parseFloat(balance.cash.toString()),
        error: 'No bonus to forfeit'
      }
    }

    // 1. Remove bonus from balance
    await supabase
      .from('balances')
      .update({ bonus: 0 })
      .eq('id', userId)

    // 2. Clear playthrough tracking
    await supabase
      .from('geostakes_playthrough')
      .update({
        bonus_balance: 0,
        playthrough_required: 0,
        playthrough_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // 3. Record transaction
    await recordTransaction(userId, -bonusAmount, 'bonus_forfeited', {
      reason: 'user_requested_forfeit'
    })

    return {
      success: true,
      bonus_forfeited: bonusAmount,
      withdrawable_balance: parseFloat(balance.cash.toString())
    }
  } catch (error) {
    console.error('Error forfeiting bonus:', error)

    return {
      success: false,
      bonus_forfeited: 0,
      withdrawable_balance: 0,
      error: 'Failed to forfeit bonus'
    }
  }
}

// ============================================================================
// AUTOMATIC CLEANUP
// ============================================================================

/**
 * Expire and forfeit bonuses older than 30 days
 * Run this as a cron job (daily)
 */
export async function expireOldBonuses(): Promise<{
  expired_count: number
  total_forfeited: number
}> {
  try {
    // Find all expired bonuses
    const { data: expired, error: selectError } = await supabase
      .from('geostakes_playthrough')
      .select('user_id, bonus_balance')
      .lt('bonus_expires_at', new Date().toISOString())
      .gt('bonus_balance', 0)

    if (selectError || !expired) {
      throw selectError
    }

    let totalForfeited = 0

    for (const record of expired) {
      const result = await forfeitBonus(record.user_id)
      if (result.success) {
        totalForfeited += result.bonus_forfeited
      }
    }

    return {
      expired_count: expired.length,
      total_forfeited: totalForfeited
    }
  } catch (error) {
    console.error('Error expiring old bonuses:', error)
    return {
      expired_count: 0,
      total_forfeited: 0
    }
  }
}
