import { imageSize } from "image-size";

// A vehicle photo's real content-type, from the actual uploaded file's own
// extension — never guessed from e.g. the vehicle's other fields.
export function mimeTypeFromStoragePath(url: string): string {
  const extension = url.split(".").pop()?.toLowerCase().split(/[?#]/)[0];
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Reads just enough of the real file (a 64KB Range request — Supabase
 * Storage supports partial content, and every real image's dimensions live
 * in its header, well within that) to get accurate width/height for
 * og:image, instead of downloading the whole photo or fabricating a
 * plausible-looking constant. A prior version hardcoded 1200x900 as a
 * "landscape hint" — live vehicle photos turned out to range from
 * 1200x799 to 1200x1695 (portrait), so that guess was actively wrong for
 * most listings, not just imprecise, and is a likely reason WhatsApp
 * specifically (much stricter about declared-vs-actual image dimensions
 * than Facebook's own crawler) kept showing no thumbnail even once
 * type/width/height were all present.
 *
 * Wrapped defensively: a network hiccup or a format image-size can't parse
 * must never break the page itself, since this only feeds optional Open
 * Graph metadata — returns null (caller omits width/height entirely,
 * still valid Open Graph) rather than a guess.
 */
export async function probeImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-65535" } });
    if (!response.ok && response.status !== 206) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    const { width, height } = imageSize(buffer);
    return { width, height };
  } catch {
    return null;
  }
}
