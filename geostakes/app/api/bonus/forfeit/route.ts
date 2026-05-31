/**
 * POST /api/bonus/forfeit
 * Forfeit all bonus balance to unlock immediate withdrawal
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { forfeitBonus } from '@/lib/bonus'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await forfeitBonus(user.id)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to forfeit bonus' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    bonus_forfeited: result.bonus_forfeited,
    withdrawable_balance: result.withdrawable_balance
  })
}
