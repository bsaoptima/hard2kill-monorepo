import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArcadeAuthLayout } from "@/components/arcade-auth-layout";

export const metadata = {
  title: "Sign in — Geostakes",
};

type SearchParams = Promise<{ error?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { error } = await searchParams;

  return <ArcadeAuthLayout />;
}
