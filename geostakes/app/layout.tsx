import type { Metadata } from "next";
import { Inter, Anton, Space_Grotesk, Space_Mono, JetBrains_Mono, Saira_Condensed } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { ConditionalLayout } from "@/components/conditional-layout";
import { Header } from "@/components/header";
import { ArcadeMarqueeBanner } from "@/components/arcade-marquee-banner";
import { Toaster } from "@/components/ui/sonner";
import { Web3Provider } from "@/components/web3-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const sairaCondensed = Saira_Condensed({
  variable: "--font-saira-condensed",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Geostakes — Stake. Guess. Win.",
  description: "Skill-based 1v1 GeoGuessr betting.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookies = headersList.get("cookie");

  return (
    <html
      lang="en"
      data-theme="midnight"
      data-font="anton"
      className={`${inter.variable} ${anton.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${sairaCondensed.variable} ${jetbrains.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Web3Provider cookies={cookies}>
          <ConditionalLayout header={<Header />} banner={<ArcadeMarqueeBanner />}>
            <main className="flex-1 flex flex-col">{children}</main>
          </ConditionalLayout>
          <Toaster />
        </Web3Provider>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="c1657370-4b18-4188-8719-af5eb165dc8c"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
