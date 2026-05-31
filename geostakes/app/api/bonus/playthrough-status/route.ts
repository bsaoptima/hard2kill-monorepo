/**
 * GET /api/bonus/playthrough-status
 * Returns current playthrough status for authenticated user
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlaythroughStatus } from '@/lib/bonus'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getPlaythroughStatus(user.id)

  if (!status) {
    return NextResponse.json({ error: 'Failed to get playthrough status' }, { status: 500 })
  }

  return NextResponse.json(status)
}
