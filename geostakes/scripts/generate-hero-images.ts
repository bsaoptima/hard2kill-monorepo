/**
 * Generate 12 hero-background Street View images from geostakes_locations.
 *
 * Picks N random active locations (with a cached pano_id) and fetches the
 * Street View Static API for each, saving as public/street-view/01.jpg…12.jpg.
 * Uses each location's curated heading/pitch so the framed view matches the
 * starting angle a player would actually see.
 *
 * If there are fewer than 12 active locations in the DB, the script cycles
 * the available ones (with different headings) to fill out the 12 tiles.
 *
 * Usage:
 *   npm run generate-hero-images
 *
 * Cost: ~$0.08 per run (12 Static API requests).
 */

import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const COUNT = 12;
const SIZE = "800x450"; // 16:9 to match tile aspect ratio
const FOV = 90;

const MAPS_KEY =
  process.env.GOOGLE_MAPS_SERVER_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!MAPS_KEY) {
  console.error("Missing GOOGLE_MAPS_SERVER_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const outDir = join(__dirname, "..", "public", "street-view");

type LocRow = {
  id: string;
  pano_id: string;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  pitch: number | null;
  label: string | null;
};

async function fetchImage(
  panoId: string,
  heading: number,
  pitch: number,
): Promise<Buffer> {
  const url = `https://maps.googleapis.com/maps/api/streetview?size=${SIZE}&pano=${panoId}&fov=${FOV}&heading=${heading}&pitch=${pitch}&key=${MAPS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  // Static API returns a tiny gray PNG when no imagery is available;
  // those are ~5KB. Real imagery is 60-200KB.
  const buf = Buffer.from(buffer);
  if (buf.length < 8 * 1024) {
    throw new Error(`Empty / placeholder response (${buf.length} bytes)`);
  }
  return buf;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const { data: rows, error } = await supabase
    .from("geostakes_locations")
    .select("id, pano_id, lat, lng, heading, pitch, label")
    .eq("active", true)
    .not("pano_id", "is", null);

  if (error) {
    console.error("DB query failed:", error.message);
    process.exit(1);
  }
  const candidates = (rows ?? []) as LocRow[];
  if (candidates.length === 0) {
    console.error(
      "No active locations with pano_id in DB. Curate some via /admin/locations first.",
    );
    process.exit(1);
  }

  // Shuffle once, then cycle if fewer than COUNT — varying the heading
  // on repeats so cycled tiles don't look identical.
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picks: { row: LocRow; heading: number; pitch: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    const base = shuffled[i % shuffled.length];
    const cycle = Math.floor(i / shuffled.length);
    const heading = ((base.heading ?? 0) + cycle * 90) % 360;
    const pitch = base.pitch ?? 0;
    picks.push({ row: base, heading, pitch });
  }

  console.log(
    `${candidates.length} candidate locations in pool. Generating ${COUNT} tiles…\n`,
  );

  let okCount = 0;
  let failCount = 0;
  for (let i = 0; i < picks.length; i++) {
    const { row, heading, pitch } = picks[i];
    const filename = `${String(i + 1).padStart(2, "0")}.jpg`;
    const tag =
      row.label ??
      `${row.lat?.toFixed(3)},${row.lng?.toFixed(3)} (${row.pano_id.slice(0, 8)}…)`;
    process.stdout.write(
      `  ${filename}  ${tag.padEnd(38).slice(0, 38)}  h=${heading.toString().padStart(3)}°  `,
    );
    try {
      const img = await fetchImage(row.pano_id, heading, pitch);
      await writeFile(join(outDir, filename), img);
      const sizeKb = Math.round(img.length / 1024);
      console.log(`✓ ${sizeKb} KB`);
      okCount++;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`);
      failCount++;
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(
    `\n${okCount} succeeded, ${failCount} failed. Images in public/street-view/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
