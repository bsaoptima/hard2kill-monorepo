/**
 * GET /api/balance
 * Returns current cash and bonus balance for authenticated user
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBalance } from '@/lib/balance'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const balance = await getBalance(user.id)

  return NextResponse.json(balance)
}
