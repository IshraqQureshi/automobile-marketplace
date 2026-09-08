import type { Metadata } from "next";
import { LegalStub } from "@/components/legal-stub";

// Placeholder content pending real legal copy from the client (B-006) —
// noindex rather than a keyword-rich description for a page that doesn't
// have its real content yet; revisit once B-006 is resolved.
export const metadata: Metadata = {
  title: "Cookie Policy — HarakaGari",
  alternates: { canonical: "/cookie-policy" },
  robots: { index: false, follow: true },
};

export default function CookiePolicyPage() {
  return <LegalStub title="Cookie Policy" />;
}
