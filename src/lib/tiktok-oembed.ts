export interface TikTokOEmbedResult {
  title: string;
  thumbnailUrl: string;
}

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
    if (
      typeof data !== "object" ||
      data === null ||
      !("title" in data) ||
      !("thumbnail_url" in data) ||
      typeof data.title !== "string" ||
      typeof data.thumbnail_url !== "string"
    ) {
      return null;
    }
    return { title: data.title, thumbnailUrl: data.thumbnail_url };
  } catch {
    return null;
  }
}
