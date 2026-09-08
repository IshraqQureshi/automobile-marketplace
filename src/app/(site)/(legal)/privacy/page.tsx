import type { Metadata } from "next";
import { LegalStub } from "@/components/legal-stub";

// Placeholder content pending real legal copy from the client (B-006) —
// noindex rather than a keyword-rich description for a page that doesn't
// have its real content yet; revisit once B-006 is resolved.
export const metadata: Metadata = {
  title: "Privacy Policy — HarakaGari",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <LegalStub title="Privacy Policy" />;
}
