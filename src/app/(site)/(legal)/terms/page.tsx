import type { Metadata } from "next";
import { LegalStub } from "@/components/legal-stub";

// Placeholder content pending real legal copy from the client (B-006) —
// noindex rather than a keyword-rich description for a page that doesn't
// have its real content yet; revisit once B-006 is resolved.
export const metadata: Metadata = {
  title: "Terms of Service — HarakaGari",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <LegalStub title="Terms of Service" />;
}
