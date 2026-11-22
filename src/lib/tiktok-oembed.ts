export interface TikTokOEmbedResult {
  title: string;
  // TikTok's oEmbed no longer returns a thumbnail for many videos, so this
  // is genuinely optional — the card renders a placeholder tile instead.
  thumbnailUrl: string | null;
}

export const TIKTOK_FALLBACK_TITLE = "TikTok video";

/**
 * Fetches a TikTok video's real title/thumbnail from TikTok's own public
 * oEmbed endpoint — used to render a showroom's pasted video links as real
 * thumbnail cards (same HighlightSection layout the homepage's admin-
 * curated TikTok/YouTube sections already use), instead of fabricating a
 * generic placeholder thumbnail for content this app doesn't otherwise
 * have any real preview data for.
 *
 * Wrapped defensively, same convention as probeImageDimensions
 * (src/lib/og-image.ts): a network hiccup, a deleted/private video, or an
 * unparseable response must never break the page — returns null (caller
 * drops that one card) rather than a guess. Bounded with a short timeout
 * since this runs at render time on a public page.
 */
export async function fetchTikTokOEmbed(url: string): Promise<TikTokOEmbedResult | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) return null;
    // A real video answers with { type: "video", html: "<iframe…>" }; an
    // error body ({ message, code }) has neither. title/thumbnail_url used
    // to be required here, but TikTok stopped sending them — requiring them
    // made every valid video resolve to null and the whole section vanish.
    const type = "type" in data ? data.type : undefined;
    const html = "html" in data ? data.html : undefined;
    const rawTitle = "title" in data && typeof data.title === "string" ? data.title.trim() : "";
    const thumbnailUrl = "thumbnail_url" in data && typeof data.thumbnail_url === "string" && data.thumbnail_url ? data.thumbnail_url : null;
    if (type !== "video" && typeof html !== "string" && !rawTitle && !thumbnailUrl) return null;
    const title = rawTitle || TIKTOK_FALLBACK_TITLE;
    return { title, thumbnailUrl };
  } catch {
    return null;
  }
}
