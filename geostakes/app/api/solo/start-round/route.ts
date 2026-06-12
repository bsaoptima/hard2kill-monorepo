/**
 * POST /api/solo/start-round
 * Gets a random unplayed location for the user
 * Does NOT deduct stake yet (happens on guess submission)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  // Get all locations
  const { data: allLocations } = await adminSupabase
    .from('geostakes_locations')
    .select('id, lat, lng, label')

  if (!allLocations || allLocations.length === 0) {
    return NextResponse.json({ error: 'No locations available' }, { status: 400 })
  }

  // Get played locations for this user
  const { data: playedLocations } = await adminSupabase
    .from('geostakes_solo_played_locations')
    .select('location_id')
    .eq('user_id', user.id)

  const playedLocationIds = new Set(
    playedLocations?.map((p) => p.location_id) ?? []
  )

  // Filter to unplayed locations
  const unplayedLocations = allLocations.filter(
    (loc) => !playedLocationIds.has(loc.id)
  )

  if (unplayedLocations.length === 0) {
    return NextResponse.json(
      { error: 'No unplayed locations remaining. Check back for new locations!' },
      { status: 400 }
    )
  }

  // Pick random unplayed location
  const randomLocation =
    unplayedLocations[Math.floor(Math.random() * unplayedLocations.length)]

  console.log('[start-round] Selected location:', {
    locationId: randomLocation.id,
    label: randomLocation.label,
  })

  // Return location (lat/lng needed to load Street View pano)
  // 25-second timer prevents cheating via reverse image search
  return NextResponse.json({
    locationId: randomLocation.id,
    lat: randomLocation.lat,
    lng: randomLocation.lng,
    label: randomLocation.label,
  })
}
