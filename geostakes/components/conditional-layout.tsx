"use client";

import { usePathname } from "next/navigation";

export function ConditionalLayout({
  children,
  header,
  banner,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  banner: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide header and banner on game routes
  const isGameRoute = pathname.startsWith("/play");

  return (
    <>
      {!isGameRoute && header}
      {!isGameRoute && banner}
      {children}
    </>
  );
}
