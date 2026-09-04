import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HarakaGari",
  description: "Kenya's premium automobile marketplace — verified showrooms, bank finance, and HP installments.",
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
