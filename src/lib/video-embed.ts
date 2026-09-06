const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,15}$/;

/**
 * Derives a playable YouTube embed URL from any admin-pasted video URL
 * (watch/shorts/youtu.be/already-embed forms). Returns null when the ID
 * can't be confidently extracted, so callers can fall back to a plain
 * "watch on YouTube" link rather than rendering a broken iframe.
 *
 * `autoplay` defaults to true, matching the only original caller
 * (src/components/home/highlight-section.tsx's modal — autoplay is
 * appropriate there since the modal only ever opens after a deliberate
 * click). Pass `{ autoplay: false }` for an embed that renders directly
 * on page load (e.g. a showroom's own featured video), where autoplaying
 * unrequested video/audio the moment a visitor lands would be poor UX.
 */
/**
 * Extracts the raw YouTube video ID from any admin/owner-pasted video URL
 * (watch/shorts/youtu.be/already-embed forms). Returns null when it can't
 * be confidently extracted. Shared by getYouTubeEmbedUrl (below) and by
 * callers that need the ID itself — e.g. deriving a thumbnail image from
 * YouTube's own static thumbnail CDN without a separate upload/Storage step.
 */
export function getYouTubeVideoId(url: string): string | null {
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

  return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
}

export function getYouTubeEmbedUrl(url: string, options: { autoplay?: boolean } = {}): string | null {
  const { autoplay = true } = options;
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0`;
}

/**
 * A real, freely-hosted YouTube thumbnail image for the given video — no
 * Storage upload/admin curation step needed (unlike homepage_highlights'
 * admin-uploaded thumbnails), since YouTube itself serves this for any
 * public video ID. `hqdefault.jpg` exists for every video (unlike
 * maxresdefault, which 404s for older/lower-resolution uploads).
 */
export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
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
