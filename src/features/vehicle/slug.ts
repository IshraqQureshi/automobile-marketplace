// URL scheme for vehicle detail pages: /{brand-slug}/{name-slug}-{uuid}
// (e.g. /bmw/530i-m-sport-3fa8...). The trailing 36 characters are always
// the real vehicle id (a standard v4 UUID is exactly 36 characters
// including its 4 hyphens) — everything before that is human-readable only,
// never used for the actual lookup, so it can never itself cause a 404 even
// if it's stale (e.g. copied before a listing's title changed).
const UUID_LENGTH = 36;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface VehicleSlugInput {
  id: string;
  make: string;
  model: string;
  variant?: string | null;
}

export function getVehicleBrandSlug(make: string): string {
  return slugify(make);
}

export function getVehicleNameSlug(vehicle: VehicleSlugInput): string {
  const name = vehicle.variant ? `${vehicle.model} ${vehicle.variant}` : vehicle.model;
  const slug = slugify(name);
  return `${slug ? `${slug}-` : ""}${vehicle.id}`;
}

export function getVehicleDetailPath(vehicle: VehicleSlugInput): string {
  return `/${getVehicleBrandSlug(vehicle.make)}/${getVehicleNameSlug(vehicle)}`;
}

/**
 * Recovers the real vehicle id from a `{name-slug}-{uuid}` route segment.
 * Returns null when the last 36 characters aren't a well-formed UUID (a
 * malformed/guessed URL), so the caller can 404 rather than querying with
 * garbage.
 */
export function parseVehicleIdFromSlug(slug: string): string | null {
  if (slug.length < UUID_LENGTH) return null;
  const candidate = slug.slice(-UUID_LENGTH);
  return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}
