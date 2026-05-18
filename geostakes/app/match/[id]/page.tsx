import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatchState } from "@/lib/match";
import { MatchRoom } from "@/components/match-room";

export const metadata = {
  title: "Match — Geostakes",
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/signin?next=/match/${id}`);
  }

  const initialState = await getMatchState(id, user.id);
  if ("error" in initialState) {
    notFound();
  }

  return <MatchRoom matchId={id} initialState={initialState} />;
}
