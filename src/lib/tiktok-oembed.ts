export interface TikTokOEmbedResult {
  title: string;
  // TikTok's oEmbed no longer returns a thumbnail for many videos, so this
  // is genuinely optional — the card renders a placeholder tile instead.
  thumbnailUrl: string | null;
}

export const TIKTOK_FALLBACK_TITLE = "TikTok video";

// Only ever render an image from TikTok's own CDN — the URL comes out of
// scraped HTML, so it's checked before it can reach an <img src>.
function isTikTokCdnImage(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && /(^|\.)tiktokcdn(-us)?\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * TikTok's oEmbed no longer returns a thumbnail, but the public video page
 * still embeds the video's cover image (a signed tiktokcdn.com URL that
 * stays valid for ~2 days — hence the short revalidate window, so a cached
 * URL is refreshed well before it expires). Best-effort like everything
 * else here: any failure returns null and the card shows its placeholder.
 */
export async function fetchTikTokCoverUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/"cover":"([^"]+)"/);
    if (!match?.[1]) return null;
    const decoded: unknown = JSON.parse(`"${match[1]}"`);
    return typeof decoded === "string" && isTikTokCdnImage(decoded) ? decoded : null;
  } catch {
    return null;
  }
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
    return { title, thumbnailUrl: thumbnailUrl ?? (await fetchTikTokCoverUrl(url)) };
  } catch {
    return null;
  }
}
