import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SoloPlayRoom } from "@/components/solo-play-room";

export const metadata = {
  title: "Solo Mode — Geostakes",
};

export default async function SoloPlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/signin?next=/play-solo`);
  }

  return <SoloPlayRoom />;
}
