const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,15}$/;

/**
 * Derives a playable YouTube embed URL from any admin-pasted video URL
 * (watch/shorts/youtu.be/already-embed forms). Returns null when the ID
 * can't be confidently extracted, so callers can fall back to a plain
 * "watch on YouTube" link rather than rendering a broken iframe.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let id: string | null = null;
  if (parsed.hostname.endsWith("youtu.be")) {
    id = parsed.pathname.slice(1).split("/")[0] || null;
  } else if (parsed.hostname.endsWith("youtube.com")) {
    if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
    } else if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
    }
  }

  if (!id || !YOUTUBE_ID_PATTERN.test(id)) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}

/**
 * Derives a playable TikTok embed URL (their public /embed/v2/{id} form) from
 * an admin-pasted full video URL (https://www.tiktok.com/@handle/video/123…).
 * Short/shared links (vm.tiktok.com/…) don't carry the numeric ID and would
 * need a network redirect to resolve, so those return null — the caller
 * falls back to a plain "watch on TikTok" link instead.
 */
export function getTikTokEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!parsed.hostname.endsWith("tiktok.com")) return null;
  const match = parsed.pathname.match(/\/video\/(\d+)/);
  const id = match?.[1];
  if (!id) return null;
  return `https://www.tiktok.com/embed/v2/${id}`;
}
