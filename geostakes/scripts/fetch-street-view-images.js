/**
 * Fetch Street View images for demo
 *
 * Usage: node scripts/fetch-street-view-images.js
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const LOCATIONS = [
  { name: "Shibuya Crossing, Tokyo", lat: 35.6595, lng: 139.7005 },
  { name: "Times Square, New York", lat: 40.7580, lng: -73.9855 },
  { name: "Dam Square, Amsterdam", lat: 52.3728, lng: 4.8936 },
  { name: "Brandenburg Gate, Berlin", lat: 52.5163, lng: 13.3777 },
  { name: "Champ de Mars, Paris", lat: 48.8556, lng: 2.2986 },
  { name: "Circular Quay, Sydney", lat: -33.8612, lng: 151.2107 },
  { name: "Copacabana, Rio de Janeiro", lat: -22.9711, lng: -43.1822 },
  { name: "Marina Bay, Singapore", lat: 1.2839, lng: 103.8607 },
];

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../public/street-view');

if (!API_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchStreetViewImage(lat, lng, index) {
  const filename = String(index + 1).padStart(2, '0') + '.jpg';
  const filepath = path.join(OUTPUT_DIR, filename);

  // Street View Static API
  // size: 800x600 (4:3 aspect ratio, scaled up for quality)
  // fov: 90 (field of view)
  // heading: 0 (north)
  // pitch: 0 (straight ahead)
  const url = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${API_KEY}`;

  console.log(`📸 Fetching ${LOCATIONS[index].name}...`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));

    console.log(`   ✓ Saved to ${filename}`);
    return { success: true, location: LOCATIONS[index].name, filename };
  } catch (error) {
    console.error(`   ✗ Failed: ${error.message}`);
    return { success: false, location: LOCATIONS[index].name, error: error.message };
  }
}

async function main() {
  console.log('🌍 Fetching Street View images for 8 locations...\n');

  const results = [];

  // Fetch sequentially to avoid rate limits
  for (let i = 0; i < LOCATIONS.length; i++) {
    const result = await fetchStreetViewImage(
      LOCATIONS[i].lat,
      LOCATIONS[i].lng,
      i
    );
    results.push(result);

    // Small delay between requests
    if (i < LOCATIONS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✓ ${results.filter(r => r.success).length} succeeded`);
  console.log(`   ✗ ${results.filter(r => !r.success).length} failed`);

  // Generate location mapping for reference
  console.log('\n📝 Location mapping:');
  LOCATIONS.forEach((loc, i) => {
    const filename = String(i + 1).padStart(2, '0') + '.jpg';
    console.log(`   ${filename}: ${loc.name}`);
  });
}

main().catch(console.error);
