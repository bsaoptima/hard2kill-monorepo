import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDistanceKm, calculateRoundScore } from "@/lib/scoring";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in prod" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const [{ count: locationsCount }, { count: matchesCount }, { count: guessesCount }] =
    await Promise.all([
      supabase
        .from("geostakes_locations")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("geostakes_matches")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("geostakes_round_guesses")
        .select("*", { count: "exact", head: true }),
    ]);

  // Quick scoring sanity check (NYC → Paris should be ~5837km, ~270pts)
  const nyc = { lat: 40.7128, lng: -74.006 };
  const paris = { lat: 48.8566, lng: 2.3522 };
  const distanceKm = calculateDistanceKm(nyc, paris);
  const score = calculateRoundScore(distanceKm);

  return NextResponse.json({
    schema: {
      geostakes_locations: locationsCount ?? 0,
      geostakes_matches: matchesCount ?? 0,
      geostakes_round_guesses: guessesCount ?? 0,
    },
    scoring: {
      nycToParisKm: Math.round(distanceKm),
      nycToParisScore: score,
      sane: distanceKm > 5800 && distanceKm < 5900,
    },
  });
}
