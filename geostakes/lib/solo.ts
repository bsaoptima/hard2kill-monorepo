/**
 * Solo mode utilities
 * - Multiplier calculation based on distance
 * - Distance calculation (Haversine formula)
 */

// ============================================================================
// MULTIPLIER CALCULATION
// ============================================================================

/**
 * Calculate payout multiplier based on distance from target
 *
 * Rules:
 * - 0-5km: 3x
 * - 5-25km: 2x
 * - 25-100km: 1.2x
 * - 100-300km: 0.75x
 * - 300-1000km: 0.25x
 * - 1000km+: 0x
 */
export function calculateMultiplier(distanceKm: number): number {
  if (distanceKm < 5) return 3.0;
  if (distanceKm < 25) return 2.0;
  if (distanceKm < 100) return 1.2;
  if (distanceKm < 300) return 0.75;
  if (distanceKm < 1000) return 0.25;
  return 0.0;
}

// ============================================================================
// DISTANCE CALCULATION (Haversine Formula)
// ============================================================================

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ============================================================================
// PAYOUT CALCULATION
// ============================================================================

/**
 * Calculate payout based on stake and distance
 * Returns both multiplier and final payout amount
 */
export function calculatePayout(
  stake: number,
  distanceKm: number
): { multiplier: number; payout: number } {
  const multiplier = calculateMultiplier(distanceKm);
  const payout = stake * multiplier;

  return { multiplier, payout };
}
