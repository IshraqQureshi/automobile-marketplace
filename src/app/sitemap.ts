import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

// Only routes that are genuinely public, real, and stable are listed here —
// no vehicle/showroom detail pages yet (MKT-002/MKT-004 not built), so
// those aren't fabricated into the sitemap ahead of actually existing.
const STATIC_ROUTES = ["/", "/ready-to-sell", "/register-showroom", "/privacy", "/terms", "/cookie-policy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  return STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
