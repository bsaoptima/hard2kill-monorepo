/**
 * GET /api/solo/status
 * Returns count of unplayed locations for authenticated user
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  // Count total locations
  const { count: totalCount } = await adminSupabase
    .from('geostakes_locations')
    .select('*', { count: 'exact', head: true })

  // Count played locations for this user
  const { count: playedCount } = await adminSupabase
    .from('geostakes_solo_played_locations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const unplayedCount = (totalCount ?? 0) - (playedCount ?? 0)

  return NextResponse.json({
    total: totalCount ?? 0,
    played: playedCount ?? 0,
    unplayed: unplayedCount,
  })
}
