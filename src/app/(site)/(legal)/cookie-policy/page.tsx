import type { Metadata } from "next";
import { LegalStub } from "@/components/legal-stub";

export const metadata: Metadata = { title: "Cookie Policy — HarakaGari" };

export default function CookiePolicyPage() {
  return <LegalStub title="Cookie Policy" />;
}
