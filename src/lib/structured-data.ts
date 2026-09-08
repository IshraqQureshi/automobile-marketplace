// Small, shared schema.org JSON-LD builders — kept separate so the same
// BreadcrumbList shape (used by the vehicle detail and showroom detail
// pages) and Organization identity (used by the homepage and referenced as
// a vehicle's `seller`) aren't each hand-typed twice. Every page still
// renders its own <script type="application/ld+json"> tag directly (the
// established pattern from the homepage's WebSite/vehicle detail's Vehicle
// schema) — this module only builds the plain objects.

import { publicEnv } from "@/lib/env";

const SITE_URL = publicEnv.NEXT_PUBLIC_SITE_URL;

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * HarakaGari's own identity as a platform — distinct from an individual
 * showroom's own AutoDealer schema. Used on the homepage, and referenced
 * as `seller` on a vehicle listing when a vehicle can't be attributed to a
 * specific showroom's own page (shouldn't normally happen — every vehicle
 * has a showroom — kept as a defensive fallback, not the common case).
 */
export function buildOrganizationJsonLd(socialUrls: (string | null)[] = []) {
  const sameAs = socialUrls.filter((url): url is string => Boolean(url));
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HarakaGari",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export interface VehicleListItemForSchema {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  path: string;
  imageUrl?: string | null;
}

/** ItemList of vehicle Product summaries — for a paginated /listing collection page. */
export function buildVehicleItemListJsonLd(vehicles: VehicleListItemForSchema[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: vehicles.map((vehicle, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${vehicle.path}`,
      item: {
        "@type": "Product",
        name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        url: `${SITE_URL}${vehicle.path}`,
        ...(vehicle.imageUrl ? { image: vehicle.imageUrl } : {}),
        offers: { "@type": "Offer", price: vehicle.price, priceCurrency: "KES", availability: "https://schema.org/InStock" },
      },
    })),
  };
}

export interface ShowroomListItemForSchema {
  id: string;
  businessName: string;
  path: string;
}

/** ItemList of showroom summaries — for the /showrooms directory page. */
export function buildShowroomItemListJsonLd(showrooms: ShowroomListItemForSchema[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: showrooms.map((showroom, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${showroom.path}`,
      name: showroom.businessName,
    })),
  };
}
