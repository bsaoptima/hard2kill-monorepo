// Server-side Google Street View pano resolution.
// Hits the Street View Metadata REST endpoint with a lat/lng,
// returns the nearest pano_id within `radius` meters. Free per Google docs.
// Used so we can ship pano_id to the client without exposing lat/lng.

const METADATA_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";

type MetadataResponse = {
  status: "OK" | "ZERO_RESULTS" | "NOT_FOUND" | "OVER_QUERY_LIMIT" | "REQUEST_DENIED" | "INVALID_REQUEST" | "UNKNOWN_ERROR";
  pano_id?: string;
};

export async function resolvePanoId(
  lat: number,
  lng: number,
  radius = 50,
): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[maps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set");
    return null;
  }

  const url = `${METADATA_URL}?location=${lat},${lng}&radius=${radius}&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[maps] metadata HTTP ${res.status} for ${lat},${lng}`);
      return null;
    }
    const data = (await res.json()) as MetadataResponse;
    if (data.status !== "OK" || !data.pano_id) {
      console.warn(`[maps] metadata status=${data.status} for ${lat},${lng}`);
      return null;
    }
    return data.pano_id;
  } catch (err) {
    console.error("[maps] metadata fetch failed:", err);
    return null;
  }
}
