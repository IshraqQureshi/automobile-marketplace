// URL scheme for the public showroom detail page: /showrooms/{name-slug}-{uuid}
// (e.g. /showrooms/mr-carscout-3fa8...) — the exact same "{human-readable
// slug}-{uuid}, id always the trailing 36 characters" convention as
// src/features/vehicle/slug.ts, reused deliberately rather than inventing a
// second scheme. business_name has no uniqueness constraint (two showrooms
// could share a name), so the id suffix is what's actually looked up —
// the name portion is decorative and can never itself cause a 404, even if
// it's stale (e.g. copied before a showroom renamed itself).
import { slugify } from "@/features/vehicle/slug";

const UUID_LENGTH = 36;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ShowroomSlugInput {
  id: string;
  businessName: string;
}

export function getShowroomNameSlug(showroom: ShowroomSlugInput): string {
  const slug = slugify(showroom.businessName);
  return `${slug ? `${slug}-` : ""}${showroom.id}`;
}

export function getShowroomDetailPath(showroom: ShowroomSlugInput): string {
  return `/showrooms/${getShowroomNameSlug(showroom)}`;
}

/**
 * Recovers the real showroom id from a `{name-slug}-{uuid}` route segment.
 * Returns null when the last 36 characters aren't a well-formed UUID (a
 * malformed/guessed URL), so the caller can 404 rather than querying with
 * garbage — same reasoning as parseVehicleIdFromSlug.
 */
export function parseShowroomIdFromSlug(slug: string): string | null {
  if (slug.length < UUID_LENGTH) return null;
  const candidate = slug.slice(-UUID_LENGTH);
  return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}
