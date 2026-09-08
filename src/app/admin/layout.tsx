import type { Metadata } from "next";

// Applies to every /admin route (both admin/login and the protected admin
// panel under admin/(protected)) — robots.txt already disallows crawling
// /admin, but a disallow rule only blocks the crawl, not indexing a URL
// discovered via an external link. This is the real noindex signal.
//
// CAUTION for future pages: Next.js metadata objects for the same field
// (here, `robots`) are replaced wholesale by a child segment's own value,
// not deep-merged — confirmed live for `openGraph` while building this PR
// (see the homepage/showroom-detail fix in the same commit). If any future
// page under /admin ever adds its own `metadata.robots` without including
// `index: false`, it will silently un-noindex itself.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
