import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Target, TrendingUp, DollarSign } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // DUMMY DATA - User stats
  const totalBalance = 847.50;
  const wins = 23;
  const losses = 7;
  const totalMatches = wins + losses;
  const winRate = ((wins / totalMatches) * 100).toFixed(1);
  const profit = 547.50;

  // DUMMY DATA - Match history
  const matches = [
    { id: 1, stake_amount: 50, created_at: new Date().toISOString(), status: "completed", won: true },
    { id: 2, stake_amount: 100, created_at: new Date(Date.now() - 86400000).toISOString(), status: "completed", won: true },
    { id: 3, stake_amount: 25, created_at: new Date(Date.now() - 172800000).toISOString(), status: "completed", won: false },
    { id: 4, stake_amount: 75, created_at: new Date(Date.now() - 259200000).toISOString(), status: "completed", won: true },
    { id: 5, stake_amount: 50, created_at: new Date(Date.now() - 345600000).toISOString(), status: "completed", won: true },
    { id: 6, stake_amount: 100, created_at: new Date(Date.now() - 432000000).toISOString(), status: "completed", won: false },
    { id: 7, stake_amount: 20, created_at: new Date(Date.now() - 518400000).toISOString(), status: "completed", won: true },
    { id: 8, stake_amount: 50, created_at: new Date(Date.now() - 604800000).toISOString(), status: "completed", won: true },
    { id: 9, stake_amount: 25, created_at: new Date(Date.now() - 691200000).toISOString(), status: "completed", won: false },
    { id: 10, stake_amount: 75, created_at: new Date(Date.now() - 777600000).toISOString(), status: "completed", won: true },
    { id: 11, stake_amount: 50, created_at: new Date(Date.now() - 864000000).toISOString(), status: "completed", won: true },
    { id: 12, stake_amount: 100, created_at: new Date(Date.now() - 950400000).toISOString(), status: "completed", won: true },
    { id: 13, stake_amount: 10, created_at: new Date(Date.now() - 1036800000).toISOString(), status: "completed", won: false },
    { id: 14, stake_amount: 50, created_at: new Date(Date.now() - 1123200000).toISOString(), status: "completed", won: true },
    { id: 15, stake_amount: 25, created_at: new Date(Date.now() - 1209600000).toISOString(), status: "completed", won: true },
  ];

  // DUMMY DATA - Leaderboard
  const leaderboardData = [
    { userId: "geo_king_42", wins: 45, losses: 12, profit: 1247.50 },
    { userId: "map_master_7", wins: 38, losses: 15, profit: 982.30 },
    { userId: user.id, wins: 23, losses: 7, profit: 547.50 }, // Current user
    { userId: "atlas_pro_99", wins: 31, losses: 18, profit: 445.20 },
    { userId: "globe_trot_33", wins: 27, losses: 14, profit: 398.75 },
    { userId: "pin_drop_21", wins: 29, losses: 19, profit: 312.40 },
    { userId: "coord_hunter", wins: 22, losses: 15, profit: 287.90 },
    { userId: "geo_wizard_5", wins: 19, losses: 12, profit: 245.60 },
    { userId: "location_ace", wins: 24, losses: 21, profit: 189.30 },
    { userId: "compass_god", wins: 16, losses: 11, profit: 156.80 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-anton)" }}>
            Profile & Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Track your stats and see how you rank against other players
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Balance</h3>
            </div>
            <p className="text-3xl font-bold">${totalBalance.toFixed(2)}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-green-500" />
              <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Win Rate</h3>
            </div>
            <p className="text-3xl font-bold">{winRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {wins}W - {losses}L
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Matches</h3>
            </div>
            <p className="text-3xl font-bold">{totalMatches}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-sm text-muted-foreground uppercase tracking-wider">
                Total Profit
              </h3>
            </div>
            <p
              className={`text-3xl font-bold ${
                profit >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-anton)" }}>
              Top Players
            </h2>
            <div className="space-y-3">
              {leaderboardData && leaderboardData.length > 0 ? (
                leaderboardData.map((player, index: number) => {
                  const totalGames = player.wins + player.losses;
                  const winRate = totalGames > 0 ? ((player.wins / totalGames) * 100).toFixed(1) : "0.0";
                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.userId === user.id
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? "bg-yellow-500 text-black"
                              : index === 1
                              ? "bg-gray-400 text-black"
                              : index === 2
                              ? "bg-orange-600 text-white"
                              : "bg-[#2a2a2a] text-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {player.userId === user.id ? "You" : player.userId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {player.wins}W - {player.losses}L
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            player.profit >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {player.profit >= 0 ? "+" : ""}${player.profit.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">{winRate}% WR</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">No leaderboard data yet</p>
              )}
            </div>
          </div>

          {/* Match History */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-anton)" }}>
              Recent Matches
            </h2>
            <div className="space-y-3">
              {matches && matches.length > 0 ? (
                matches.map((match) => {
                  const stake = Number(match.stake_amount ?? 0);
                  const result = match.won ? "WIN" : "LOSS";

                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a]"
                    >
                      <div>
                        <p className="font-semibold">${stake.toFixed(2)} Match</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(match.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold uppercase ${
                            result === "WIN" ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {result}
                        </p>
                        <p className={`text-sm ${match.won ? "text-green-500" : "text-red-500"}`}>
                          {match.won ? "+" : "-"}${stake.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">No matches played yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
