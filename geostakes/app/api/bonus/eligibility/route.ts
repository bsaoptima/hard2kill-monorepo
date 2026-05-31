/**
 * GET /api/bonus/eligibility
 * Check if user is eligible for first deposit bonus
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFirstDepositEligibility } from '@/lib/bonus'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // For now, don't pass device fingerprint/payment method
  // We'll check those at deposit time
  const eligibility = await checkFirstDepositEligibility(user.id)

  return NextResponse.json(eligibility)
}
