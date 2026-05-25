import { redirect, notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { LocationValidator } from "@/components/admin/location-validator";

export const metadata = {
  title: "Admin · Locations · Geostakes",
};

export default async function AdminLocationsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    // 404 to avoid leaking the existence of the admin namespace to non-admins
    notFound();
  }

  return <LocationValidator />;
}
