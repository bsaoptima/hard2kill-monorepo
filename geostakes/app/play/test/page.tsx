import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestPairForm } from "./test-pair-form";

export const metadata = {
  title: "Test pair — Geostakes",
};

export default async function TestPlayPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signin?next=/play/test");
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12 w-full">
      <h1 className="text-2xl font-extrabold mb-2">Test pair</h1>
      <p className="text-[13px] text-muted-foreground mb-6">
        Dev-only. Deducts the bet from both players, drops you into{" "}
        <code>/match/[id]</code>.
      </p>
      <p className="text-[12px] text-muted-foreground mb-6">
        Your ID: <span className="font-mono text-xs">{user.id}</span>
      </p>
      <TestPairForm />
    </div>
  );
}
