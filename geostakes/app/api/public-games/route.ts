import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PublicGame {
  id: string;
  a: string;
  b: string;
  stake: number;
  pot: number;
  time: string;
  winner: string;
}

// Generate deterministic dummy names for anonymization
function generateDummyName(userId: string, seed: number): string {
  const firstNames = [
    "alex",
    "jordan",
    "casey",
    "morgan",
    "riley",
  ];
  const suffixes = ["sp", "rio", "bsb", "df", "poa", "gru", "rj", "mg", "ce", "pe"];

  // Use userId hash for determinism
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }

  // Mix in seed for variety
  const combined = Math.abs(hash + seed);
  const firstName = firstNames[combined % firstNames.length];
  const suffix = suffixes[Math.floor(combined / firstNames.length) % suffixes.length];

  return `${firstName}_${suffix}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch resolved seeds (completed games)
    const { data: seeds, error } = await supabase
      .from("geostakes_seeds")
      .select("id, creator_user_id, matched_user_id, winner_user_id, bet_amount, resolved_at")
      .eq("status", "resolved")
      .not("matched_user_id", "is", null)
      .not("winner_user_id", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[public-games] error:", error);
      return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
    }

    // If no real games yet, return curated dummy data following the same rules
    if (!seeds || seeds.length === 0) {
      console.log("[public-games] No resolved seeds found, returning dummy data");
      return NextResponse.json({ games: generateDummyGames() });
    }

    // Extract unique player IDs
    const allPlayerIds = new Set<string>();
    seeds.forEach((s) => {
      allPlayerIds.add(s.creator_user_id);
      allPlayerIds.add(s.matched_user_id!);
    });

    // Select 5 distinct players (deterministic: sort by ID and take first 5)
    const selectedPlayers = Array.from(allPlayerIds).sort().slice(0, 5);
    const selectedPlayersSet = new Set(selectedPlayers);

    // Filter to only games involving these 5 players
    const filteredByPlayers = seeds.filter(
      (s) =>
        selectedPlayersSet.has(s.creator_user_id) &&
        selectedPlayersSet.has(s.matched_user_id!)
    );

    if (filteredByPlayers.length === 0) {
      console.log("[public-games] No games after filtering to 5 players, returning dummy data");
      return NextResponse.json({ games: generateDummyGames() });
    }

    // Apply max 2 rows per unique pair
    const pairCounts = new Map<string, number>();
    const filtered = [];

    for (const seed of filteredByPlayers) {
      // Create a sorted pair key so (A,B) === (B,A)
      const pair = [seed.creator_user_id, seed.matched_user_id!].sort().join("|");
      const count = pairCounts.get(pair) || 0;

      if (count < 2) {
        filtered.push(seed);
        pairCounts.set(pair, count + 1);
      }

      // Stop once we have 10 games
      if (filtered.length >= 10) break;
    }

    // Space out games to roughly hourly intervals
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    const publicGames: PublicGame[] = filtered.map((seed, idx) => {
      // Space games roughly 1 hour apart, with some randomness (45-75 min)
      const randomOffset = Math.floor(Math.random() * 30 * 60 * 1000); // 0-30 min variation
      const spacedTimestamp = new Date(now - idx * hourMs - randomOffset);

      // Calculate pot (bet_amount * 2 * 0.9 for winner after 10% rake)
      const pot = Number(seed.bet_amount) * 2 * 0.9;

      // Anonymize player names
      const creatorName = generateDummyName(seed.creator_user_id, idx * 2);
      const challengerName = generateDummyName(seed.matched_user_id!, idx * 2 + 1);

      // Determine winner name
      const winnerName =
        seed.winner_user_id === seed.creator_user_id ? creatorName : challengerName;

      // Format time ago
      const diff = now - spacedTimestamp.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const timeStr =
        hours > 0
          ? `${hours}h ago`
          : minutes > 0
          ? `${minutes}m ago`
          : `${Math.floor(diff / 1000)}s ago`;

      return {
        id: seed.id,
        a: creatorName,
        b: challengerName,
        stake: Number(seed.bet_amount),
        pot,
        time: timeStr,
        winner: winnerName,
      };
    });

    // Sort by time (should already be in order, but ensure it)
    publicGames.sort((a, b) => {
      const aMinutes = parseTimeToMinutes(a.time);
      const bMinutes = parseTimeToMinutes(b.time);
      return aMinutes - bMinutes;
    });

    // If we have too few real games, supplement with dummy data
    if (publicGames.length < 10) {
      console.log(`[public-games] Only ${publicGames.length} real games, using dummy data instead`);
      return NextResponse.json({ games: generateDummyGames() });
    }

    return NextResponse.json({ games: publicGames });
  } catch (err: any) {
    console.error("[public-games] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function parseTimeToMinutes(timeStr: string): number {
  if (timeStr.includes("h")) {
    return parseInt(timeStr) * 60;
  } else if (timeStr.includes("m")) {
    return parseInt(timeStr);
  } else {
    return 0;
  }
}

// Generate dummy games with the same constraints as real data:
// - Only 5 distinct players
// - Spaced ~1 hour apart
// - Max 2 games per pair
// - Fixed times that don't change
function generateDummyGames(): PublicGame[] {
  const players = ["alex_sp", "jordan_rio", "casey_bsb", "morgan_df", "riley_poa"];

  // Pre-defined games with fixed times
  const fixedGames: PublicGame[] = [
    { id: "G-9999", a: "alex_sp", b: "jordan_rio", stake: 5, pot: 9, time: "12m ago", winner: "alex_sp" },
    { id: "G-9998", a: "casey_bsb", b: "morgan_df", stake: 10, pot: 18, time: "1h ago", winner: "morgan_df" },
    { id: "G-9997", a: "riley_poa", b: "alex_sp", stake: 1, pot: 1.8, time: "2h ago", winner: "alex_sp" },
    { id: "G-9996", a: "jordan_rio", b: "casey_bsb", stake: 5, pot: 9, time: "3h ago", winner: "casey_bsb" },
    { id: "G-9995", a: "morgan_df", b: "riley_poa", stake: 10, pot: 18, time: "4h ago", winner: "riley_poa" },
    { id: "G-9994", a: "alex_sp", b: "casey_bsb", stake: 5, pot: 9, time: "5h ago", winner: "casey_bsb" },
    { id: "G-9993", a: "jordan_rio", b: "morgan_df", stake: 1, pot: 1.8, time: "6h ago", winner: "jordan_rio" },
    { id: "G-9992", a: "riley_poa", b: "casey_bsb", stake: 10, pot: 18, time: "7h ago", winner: "riley_poa" },
    { id: "G-9991", a: "alex_sp", b: "jordan_rio", stake: 5, pot: 9, time: "8h ago", winner: "jordan_rio" },
    { id: "G-9990", a: "morgan_df", b: "riley_poa", stake: 10, pot: 18, time: "9h ago", winner: "morgan_df" },
  ];

  return fixedGames;
}
