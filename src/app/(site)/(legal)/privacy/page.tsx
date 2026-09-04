import type { Metadata } from "next";
import { LegalStub } from "@/components/legal-stub";

export const metadata: Metadata = { title: "Privacy Policy — HarakaGari" };

export default function PrivacyPage() {
  return <LegalStub title="Privacy Policy" />;
}
