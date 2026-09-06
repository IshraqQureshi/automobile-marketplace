import { createHash } from "node:crypto";

/**
 * Hashes a client IP before it ever reaches the database — the dedup ledger
 * (vehicle_views, see 20260906030000_dedupe_vehicle_views.sql) only needs to
 * tell "same anonymous visitor" apart from "different one", never the real
 * address, so there's no reason to store it in the clear.
 */
export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip.trim()).digest("hex");
}

/**
 * Recovers the client's IP from standard proxy headers. `x-forwarded-for`
 * can carry a comma-separated chain (client, proxy1, proxy2, …) — the first
 * entry is the original client. Falls back to `x-real-ip`. Returns null
 * when neither is present (e.g. a direct local-dev connection with no
 * proxy in front of it) so the caller can decide not to record a view
 * rather than dedupe every anonymous visitor into one bucket.
 */
export function extractClientIp(getHeader: (name: string) => string | null): string | null {
  const forwardedFor = getHeader("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = getHeader("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return null;
}
