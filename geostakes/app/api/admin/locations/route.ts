import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";

export const runtime = "nodejs";

/**
 * POST /api/admin/locations — insert a validated location.
 *
 * Body: { lat, lng, panoId, label?, difficulty?, heading?, pitch? }
 *
 * The client is expected to have validated coverage via Google's
 * StreetViewService and to pass the snapped lat/lng + panoId returned by
 * that service. Server just persists.
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const panoId: string | undefined = body?.panoId;
  const label: string | undefined = body?.label?.trim() || undefined;
  const difficulty = Number(body?.difficulty ?? 3);
  const heading = Number(body?.heading ?? 0);
  const pitch = Number(body?.pitch ?? 0);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  if (!panoId || typeof panoId !== "string") {
    return NextResponse.json({ error: "Missing panoId" }, { status: 400 });
  }
  if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Dedupe on panoId — if it already exists, just return existing
  const { data: existing } = await supabase
    .from("geostakes_locations")
    .select("id")
    .eq("pano_id", panoId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ duplicate: true, id: existing.id });
  }

  const { data: inserted, error } = await supabase
    .from("geostakes_locations")
    .insert({
      lat,
      lng,
      pano_id: panoId,
      label,
      difficulty,
      heading,
      pitch,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return current total so the UI can show a counter
  const { count } = await supabase
    .from("geostakes_locations")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  return NextResponse.json({
    id: inserted.id,
    totalActive: count ?? 0,
  });
}

/**
 * GET /api/admin/locations?limit=10 — recent additions, for the UI's
 * "added so far" sidebar.
 */
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 10));

  const supabase = createAdminClient();

  const [{ data: recent }, { count }] = await Promise.all([
    supabase
      .from("geostakes_locations")
      .select("id, lat, lng, label, difficulty, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("geostakes_locations")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
  ]);

  return NextResponse.json({
    recent: recent ?? [],
    totalActive: count ?? 0,
  });
}
