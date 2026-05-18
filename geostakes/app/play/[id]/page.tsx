import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSeedPlayState } from "@/lib/seeds";
import { SeedPlayRoom } from "@/components/seed-play-room";

export const metadata = {
  title: "Play — Geostakes",
};

export default async function PlayPage({
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
    redirect(`/auth/signin?next=/play/${id}`);
  }

  const initial = await getSeedPlayState({ playId: id, userId: user.id });
  if ("error" in initial) {
    notFound();
  }

  return <SeedPlayRoom playId={id} initialState={initial} />;
}
