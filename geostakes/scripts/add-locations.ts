/**
 * Add validated Street View locations to geostakes_locations.
 *
 * Reads ./candidates.json, queries Google's Street View Metadata API for
 * each lat/lng, and inserts only the ones with actual pano coverage —
 * snapped to the real pano coordinates Google returns.
 *
 * Skips:
 *   - candidates with no Street View coverage
 *   - candidates whose snapped pano_id already exists in the DB (dedupe)
 *
 * Usage:
 *   1. Edit scripts/candidates.json — add { lat, lng, label, difficulty }
 *   2. Make sure .env.local has NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
 *      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   3. npm run add-locations
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

type Candidate = {
  lat: number;
  lng: number;
  label?: string;
  difficulty?: number;
};

type MetadataResponse = {
  status: string;
  pano_id?: string;
  location?: { lat: number; lng: number };
  copyright?: string;
  date?: string;
};

const MAPS_KEY =
  process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!MAPS_KEY) {
  console.error("Missing GOOGLE_MAPS_SERVER_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPano(lat: number, lng: number): Promise<{
  ok: boolean;
  panoId?: string;
  snappedLat?: number;
  snappedLng?: number;
  reason?: string;
}> {
  // Outdoor source = filters indoor/360 user uploads. Radius 200m = snaps
  // to nearby road if exact coordinate isn't on a pano.
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=200&source=outdoor&key=${MAPS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, reason: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as MetadataResponse;
  if (data.status === "OK" && data.pano_id) {
    return {
      ok: true,
      panoId: data.pano_id,
      snappedLat: data.location?.lat,
      snappedLng: data.location?.lng,
    };
  }
  return { ok: false, reason: data.status };
}

async function main() {
  const candidatesPath = join(__dirname, "candidates.json");
  const candidates: Candidate[] = JSON.parse(readFileSync(candidatesPath, "utf-8"));

  console.log(`Processing ${candidates.length} candidates...\n`);

  // Pre-fetch existing pano_ids so we can dedupe.
  const { data: existing } = await supabase
    .from("geostakes_locations")
    .select("pano_id");
  const existingPanos = new Set(
    (existing ?? []).map((r) => r.pano_id).filter(Boolean) as string[],
  );

  const toInsert: Array<{
    lat: number;
    lng: number;
    pano_id: string;
    label: string | undefined;
    difficulty: number;
    active: boolean;
  }> = [];

  let okCount = 0;
  let noCoverageCount = 0;
  let duplicateCount = 0;

  for (const c of candidates) {
    const tag = c.label ?? `${c.lat},${c.lng}`;
    process.stdout.write(`  ${tag.padEnd(40)} `);
    const result = await checkPano(c.lat, c.lng);
    if (!result.ok) {
      console.log(`✗ ${result.reason}`);
      noCoverageCount++;
    } else if (result.panoId && existingPanos.has(result.panoId)) {
      console.log(`↺ duplicate pano ${result.panoId.slice(0, 8)}…`);
      duplicateCount++;
    } else if (result.panoId) {
      console.log(
        `✓ ${result.panoId.slice(0, 8)}… @ ${result.snappedLat?.toFixed(4)},${result.snappedLng?.toFixed(4)}`,
      );
      okCount++;
      toInsert.push({
        lat: result.snappedLat ?? c.lat,
        lng: result.snappedLng ?? c.lng,
        pano_id: result.panoId,
        label: c.label,
        difficulty: c.difficulty ?? 3,
        active: true,
      });
      existingPanos.add(result.panoId); // prevent within-batch duplicates
    }
    // Polite throttle for Google's API
    await new Promise((r) => setTimeout(r, 80));
  }

  console.log(
    `\nProcessed: ${candidates.length} | new: ${okCount} | no coverage: ${noCoverageCount} | duplicates: ${duplicateCount}`,
  );

  if (toInsert.length === 0) {
    console.log("Nothing new to insert.");
    return;
  }

  const { error } = await supabase.from("geostakes_locations").insert(toInsert);
  if (error) {
    console.error("\nInsert failed:", error.message);
    process.exit(1);
  }

  console.log(`\n✓ Inserted ${toInsert.length} locations into geostakes_locations.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
