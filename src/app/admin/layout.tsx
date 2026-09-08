import type { Metadata } from "next";

// Applies to every /admin route (both admin/login and the protected admin
// panel under admin/(protected)) — robots.txt already disallows crawling
// /admin, but a disallow rule only blocks the crawl, not indexing a URL
// discovered via an external link. This is the real noindex signal.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
