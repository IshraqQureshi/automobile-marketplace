export interface YouTubePlaylistVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
}

// One page (YouTube's own max page size) rather than paginating through
// nextPageToken — keeps this to a single bounded external call per page
// render instead of chaining several. Real showroom playlists are expected
// to stay well under 50 videos; revisit if a real one grows past this.
const MAX_RESULTS = 50;

/**
 * Fetches every video in a YouTube playlist via the YouTube Data API v3
 * (playlistItems.list) — needed because, unlike a single video, there's no
 * oEmbed-style endpoint that lists a playlist's contents; only the real
 * Data API exposes that, hence the YOUTUBE_API_KEY requirement (see
 * .env.example). Returns [] (never throws) when the key is missing, the
 * request fails, or the response can't be parsed as expected — same
 * convention as fetchTikTokOEmbed (src/lib/tiktok-oembed.ts): a config
 * gap, network hiccup, or quota error must never break the showroom page,
 * it should just render without this section.
 */
export async function fetchYouTubePlaylistVideos(playlistId: string): Promise<YouTubePlaylistVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${MAX_RESULTS}&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } });
    if (!response.ok) return [];

    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("items" in data) || !Array.isArray(data.items)) return [];

    return data.items.flatMap((item: unknown) => {
      const video = extractVideo(item);
      return video ? [video] : [];
    });
  } catch {
    return [];
  }
}

// A video the admin removed, made private, or that YouTube took down still
// appears as a playlistItem (rather than being omitted from the response)
// but with a sentinel title and no real thumbnail — those two titles are
// the API's own signal to skip it instead of rendering a broken card.
function extractVideo(item: unknown): YouTubePlaylistVideo | null {
  if (typeof item !== "object" || item === null || !("snippet" in item)) return null;
  const snippet = item.snippet;
  if (typeof snippet !== "object" || snippet === null) return null;
  if (!("title" in snippet) || typeof snippet.title !== "string") return null;
  if (snippet.title === "Private video" || snippet.title === "Deleted video") return null;

  if (!("resourceId" in snippet) || typeof snippet.resourceId !== "object" || snippet.resourceId === null) return null;
  const resourceId = snippet.resourceId;
  if (!("videoId" in resourceId) || typeof resourceId.videoId !== "string") return null;

  if (!("thumbnails" in snippet) || typeof snippet.thumbnails !== "object" || snippet.thumbnails === null) return null;
  const thumbnails = snippet.thumbnails as Record<string, unknown>;
  const thumbnail = thumbnails.medium ?? thumbnails.high ?? thumbnails.default;
  if (typeof thumbnail !== "object" || thumbnail === null || !("url" in thumbnail) || typeof thumbnail.url !== "string") return null;

  return { id: resourceId.videoId, title: snippet.title, thumbnailUrl: thumbnail.url };
}
