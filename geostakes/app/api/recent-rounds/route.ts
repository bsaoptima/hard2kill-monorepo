import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RecentRound {
  id: string;
  player: string;
  stake: number;
  distance: number;
  multiplier: number;
  payout: number;
  time: string;
}

// Generate random username for users without real usernames
function generateRandomUsername(userId: string, seed: number): string {
  const names = [
    "atlas",
    "noctiluca",
    "MERIDIAN",
    "SKYHWK",
    "tomato.png",
    "PARALLEL",
    "longitude",
    "lumen",
    "vex.04",
    "kestrel",
    "qbit",
    "neon.cy",
    "RIVR.42",
    "obsidian",
    "hexa",
    "vrai",
    "ord1nal",
    "zenith",
    "QUOR",
    "RAY.iv",
    "phantom",
    "vapor.tx",
    "joao_sp",
    "lucas_bsb",
    "ana_curitiba",
    "matheus_be",
    "pedro_floripa",
    "isadora.cwb",
    "felipe.gru",
  ];

  // Use userId hash for determinism
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }

  // Mix in seed for variety
  const combined = Math.abs(hash + seed);
  return names[combined % names.length];
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  const diff = now - past;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    // Fetch recent solo rounds
    const { data: rounds, error } = await adminSupabase
      .from("geostakes_solo_rounds")
      .select("id, user_id, stake, distance_km, multiplier, payout, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[recent-rounds] error:", error);
      return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
    }

    if (!rounds || rounds.length === 0) {
      console.log("[recent-rounds] No rounds found");
      return NextResponse.json({ rounds: [] });
    }

    // Fetch user data for all unique user IDs
    const userIds = [...new Set(rounds.map(r => r.user_id))];
    const { data: users, error: usersError } = await adminSupabase.auth.admin.listUsers();

    if (usersError) {
      console.error("[recent-rounds] error fetching users:", usersError);
    }

    // Create a map of user_id -> username
    const userMap = new Map<string, string>();
    if (users?.users) {
      users.users.forEach(user => {
        // Try to get username from metadata, otherwise use email prefix
        const username = user.user_metadata?.username ||
                        user.user_metadata?.display_name ||
                        user.email?.split('@')[0];
        if (username) {
          userMap.set(user.id, username);
        }
      });
    }

    // Format rounds for display
    const recentRounds: RecentRound[] = rounds.slice(0, 10).map((round, idx) => {
      const playerName = userMap.get(round.user_id) || generateRandomUsername(round.user_id, idx);
      const timeAgo = formatTimeAgo(round.created_at);

      return {
        id: `S-${round.id.slice(0, 4)}`,
        player: playerName,
        stake: Number(round.stake),
        distance: Math.round(Number(round.distance_km)),
        multiplier: Number(round.multiplier),
        payout: Number(round.payout),
        time: timeAgo,
      };
    });

    return NextResponse.json({ rounds: recentRounds });
  } catch (err: any) {
    console.error("[recent-rounds] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
