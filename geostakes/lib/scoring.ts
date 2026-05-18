// Ported from geohub/backend/utils/calculateDistance.ts and calculateRoundScore.ts.
// Original is single-player + has a per-map scoreFactor. Geostakes uses a single
// world pool, so scoreFactor is fixed at 2000.

const EARTH_RADIUS_KM = 6371.071;
const SCORE_FACTOR_WORLD = 2000;
const MAX_ROUND_SCORE = 5000;
const MIN_DISTANCE_FOR_FULL_SCORE_M = 25;

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

export type LatLng = { lat: number; lng: number };

/** Haversine distance in kilometers. */
export function calculateDistanceKm(loc1: LatLng, loc2: LatLng): number {
  const lat1Rad = toRadians(loc1.lat);
  const lat2Rad = toRadians(loc2.lat);
  const deltaLat = lat2Rad - lat1Rad;
  const deltaLng = toRadians(loc2.lng - loc1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** GeoGuessr-style integer 0..5000 from a kilometer distance. */
export function calculateRoundScore(distanceKm: number): number {
  if (distanceKm * 1000 < MIN_DISTANCE_FOR_FULL_SCORE_M) {
    return MAX_ROUND_SCORE;
  }

  const power = -distanceKm / SCORE_FACTOR_WORLD;
  const score = MAX_ROUND_SCORE * Math.exp(power);

  if (score < 0) return 0;
  return Math.round(score);
}
