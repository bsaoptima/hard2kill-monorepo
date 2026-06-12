/**
 * GET /api/stats/total-rounds
 * Returns platform-wide statistics:
 * - Total rounds played (solo + duel)
 * - Total paid out (sum of all balances)
 * - Total players (registered users)
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  // Count solo rounds
  const { count: soloCount } = await supabase
    .from('geostakes_solo_rounds')
    .select('*', { count: 'exact', head: true })

  // Count duel rounds (each match has 5 rounds, multiply by 5)
  const { count: matchCount } = await supabase
    .from('geostakes_matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'settled')

  const totalRounds = (soloCount ?? 0) + (matchCount ?? 0) * 5

  // Sum all user balances (cash + bonus) = total paid out
  const { data: balances } = await supabase
    .from('balances')
    .select('balance, bonus')

  const totalPaidOut = (balances ?? []).reduce((sum, b) => {
    const cash = Number(b.balance ?? 0)
    const bonus = Number(b.bonus ?? 0)
    return sum + cash + bonus
  }, 0)

  // Count registered users
  const { count: totalPlayers } = await supabase
    .from('balances')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    totalRounds,
    totalPaidOut: Math.round(totalPaidOut), // Round to whole dollars
    totalPlayers: totalPlayers ?? 0,
  })
}
