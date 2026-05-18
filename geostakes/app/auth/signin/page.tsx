import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

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

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-6 bg-card p-8 rounded-sm">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-[22px] font-extrabold">Login</h1>
          <p className="text-[13px] text-muted-foreground">
            One account works across Geostakes and Hard2Kill.
          </p>
        </div>

        {error === "auth-failed" ? (
          <p className="text-sm text-destructive text-center">
            Sign-in failed. Try again.
          </p>
        ) : null}

        <SignInForm />
      </div>
    </div>
  );
}
