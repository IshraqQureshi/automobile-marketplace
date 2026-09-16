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
 * Vehicle photos are stored completely unprocessed (no resize/re-encode
 * step anywhere in the upload path — see media-upload.ts), so a real
 * camera-originated JPEG's EXIF/ICC block could in principle push its
 * actual pixel-dimension marker past 64KB; when that happens `imageSize`
 * throws and this falls back to the page's honest "no width/height"
 * state (still valid Open Graph), not a crash and not a guess.
 *
 * `next: { revalidate }` caches the result — a photo's pixel dimensions
 * never change, so there's no reason to re-fetch on every render of a
 * public page that real visitors and every social platform's own
 * independent preview crawler (WhatsApp, Facebook, X, Slack, ...) can all
 * hit repeatedly. `AbortSignal.timeout` bounds the worst case to "this
 * one photo's thumbnail is momentarily missing" rather than "this page is
 * slow," since a hung fetch (vs. an outright network error) wouldn't
 * otherwise be caught by the try/catch alone.
 */
export async function probeImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-65535" },
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 86400 },
    });
    // A CDN/proxy layer that ignores Range entirely would return 200 with
    // the WHOLE file — bail out rather than reading a full multi-MB photo
    // into memory just to get its header (response.ok alone doesn't catch
    // this, since 200 is as much "ok" as 206 is).
    if (response.status !== 206) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    const { width, height } = imageSize(buffer);
    return { width, height };
  } catch {
    return null;
  }
}
