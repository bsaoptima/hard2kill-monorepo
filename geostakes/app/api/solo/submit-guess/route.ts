/**
 * POST /api/solo/submit-guess
 * Processes a solo round guess:
 * - Validates location hasn't been played
 * - Deducts stake
 * - Calculates distance & multiplier
 * - Credits payout
 * - Records round
 * - Marks location as played
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBalance, deductBalance, creditCash } from '@/lib/balance'
import { calculateDistance, calculatePayout } from '@/lib/solo'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { locationId, guessLat, guessLng, stake } = body

  console.log('[submit-guess] Received:', { locationId, guessLat, guessLng, stake })

  // Validate inputs
  if (!locationId || guessLat == null || guessLng == null || !stake) {
    console.error('[submit-guess] Missing fields:', { locationId, guessLat, guessLng, stake })
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (stake <= 0) {
    return NextResponse.json({ error: 'Stake must be positive' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Check if user has already played this location
  const { data: alreadyPlayed } = await adminSupabase
    .from('geostakes_solo_played_locations')
    .select('location_id')
    .eq('user_id', user.id)
    .eq('location_id', locationId)
    .maybeSingle()

  if (alreadyPlayed) {
    return NextResponse.json(
      { error: 'You have already played this location' },
      { status: 400 }
    )
  }

  // Get the actual location coordinates
  const { data: location } = await adminSupabase
    .from('geostakes_locations')
    .select('lat, lng')
    .eq('id', locationId)
    .single()

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  // Check user has sufficient balance
  const balance = await getBalance(user.id)
  if (balance.total < stake) {
    return NextResponse.json(
      { error: 'Insufficient balance' },
      { status: 400 }
    )
  }

  // Calculate distance and payout
  const distanceKm = calculateDistance(
    location.lat,
    location.lng,
    guessLat,
    guessLng
  )

  const { multiplier, payout } = calculatePayout(stake, distanceKm)

  // Deduct stake from balance
  const deductResult = await deductBalance(user.id, stake)
  if (!deductResult.success) {
    return NextResponse.json(
      { error: 'Failed to deduct stake' },
      { status: 500 }
    )
  }

  // Credit payout (if any)
  if (payout > 0) {
    await creditCash(user.id, payout)
  }

  // Record the round
  await adminSupabase.from('geostakes_solo_rounds').insert({
    user_id: user.id,
    location_id: locationId,
    stake,
    guess_lat: guessLat,
    guess_lng: guessLng,
    distance_km: distanceKm,
    multiplier,
    payout,
  })

  // Mark location as played
  await adminSupabase.from('geostakes_solo_played_locations').insert({
    user_id: user.id,
    location_id: locationId,
  })

  // Calculate profit/loss for this round
  const profitLoss = payout - stake

  // Get updated balance
  const newBalance = await getBalance(user.id)

  return NextResponse.json({
    distanceKm,
    multiplier,
    payout,
    profitLoss,
    actualLocation: {
      lat: location.lat,
      lng: location.lng,
    },
    balance: newBalance,
  })
}
