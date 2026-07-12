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

  // Hide header and banner on game routes and auth pages
  const isGameRoute = pathname.startsWith("/play");
  const isAuthRoute = pathname.startsWith("/auth");
  const hideLayout = isGameRoute || isAuthRoute;

  return (
    <>
      {!hideLayout && header}
      {!hideLayout && banner}
      {children}
    </>
  );
}
