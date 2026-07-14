import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's solo rounds with location labels
    const { data: rounds, error } = await supabase
      .from("geostakes_solo_rounds")
      .select("id, location_id, stake, distance_km, multiplier, payout, created_at, geostakes_locations(label)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[history] error:", error);
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ rounds: [], stats: getEmptyStats() });
    }

    // Calculate stats
    const totalStaked = rounds.reduce((sum, r) => sum + Number(r.stake), 0);
    const totalWon = rounds.reduce((sum, r) => sum + Number(r.payout), 0);
    const wins = rounds.filter(r => Number(r.payout) > Number(r.stake)).length;
    const net = totalWon - totalStaked;

    const stats = {
      roundsPlayed: rounds.length,
      winRate: Math.round((wins / rounds.length) * 100),
      totalStaked,
      net,
    };

    // Format rounds for display
    const formattedRounds = rounds.map((round) => {
      const locationData = round.geostakes_locations as { label: string | null } | null;
      return {
        id: round.id,
        locationId: round.location_id,
        locationLabel: locationData?.label ?? null,
        stake: Number(round.stake),
        distanceKm: Math.round(Number(round.distance_km)),
        multiplier: Number(round.multiplier),
        payout: Number(round.payout),
        createdAt: round.created_at,
        isWin: Number(round.payout) > Number(round.stake),
      };
    });

    return NextResponse.json({ rounds: formattedRounds, stats });
  } catch (err: any) {
    console.error("[history] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function getEmptyStats() {
  return {
    roundsPlayed: 0,
    winRate: 0,
    totalStaked: 0,
    net: 0,
  };
}
