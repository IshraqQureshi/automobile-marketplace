import type { Metadata } from "next";
import "./globals.css";
import { publicEnv } from "@/lib/env";

// Deliberately no title.template here — every existing page already sets
// its own complete "X — HarakaGari"/"X — HarakaGari Admin" string title, so
// a parent template would double-suffix all of them ("X — HarakaGari — HarakaGari").
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: "HarakaGari",
  description: "Kenya's premium automobile marketplace — verified showrooms, bank finance, and HP installments.",
  openGraph: {
    siteName: "HarakaGari",
    type: "website",
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
