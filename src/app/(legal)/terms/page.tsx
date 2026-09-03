import type { Metadata } from "next";
import { LegalStub } from "@/components/legal-stub";

export const metadata: Metadata = { title: "Terms of Service — HarakaGari" };

export default function TermsPage() {
  return <LegalStub title="Terms of Service" />;
}
