import type { HighlightCardItem } from "@/components/home/highlight-section";
import { HighlightSection } from "@/components/home/highlight-section";
import { YouTubeIcon } from "@/components/ui/social-icons";
import { getYouTubePlaylistId } from "@/lib/video-embed";
import { fetchYouTubePlaylistVideos } from "@/lib/youtube-playlist";

/**
 * Resolves a showroom's admin-set YouTube playlist (youtube_playlist_url)
 * into real, renderable highlight cards — one per video in the playlist,
 * same split-from-the-component pattern as resolveShowroomTikTokHighlights
 * (showroom-tiktok-highlights.tsx).
 */
export async function resolveShowroomYoutubeHighlights(playlistUrl: string | null): Promise<HighlightCardItem[]> {
  if (!playlistUrl) return [];
  const playlistId = getYouTubePlaylistId(playlistUrl);
  if (!playlistId) return [];

  const videos = await fetchYouTubePlaylistVideos(playlistId);
  return videos.map((video) => ({
    id: video.id,
    title: video.title,
    videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnailUrl: video.thumbnailUrl,
  }));
}

interface ShowroomYoutubeHighlightsProps {
  businessName: string;
  playlistUrl: string | null;
  items: HighlightCardItem[];
}

/**
 * Renders every video in a showroom's admin-set YouTube playlist (see
 * resolveShowroomYoutubeHighlights) as its own card, using the same
 * thumbnail-grid + click-to-play-modal layout as the homepage's
 * admin-curated "Reviews & Guides" section and ShowroomTikTokHighlights.
 * Replaces the single always-playing "videoseries" iframe this used to be
 * (the old ShowroomPlaylistSection), per direct request to show each video
 * in the playlist as its own card instead of one embedded player.
 */
export function ShowroomYoutubeHighlights({ businessName, playlistUrl, items }: ShowroomYoutubeHighlightsProps) {
  if (items.length === 0) return null;

  const playlistId = playlistUrl ? getYouTubePlaylistId(playlistUrl) : null;

  return (
    <HighlightSection
      eyebrow="On YouTube"
      heading={`${businessName} Videos`}
      subtitle="Watch more from this showroom on YouTube"
      handleLabel="View full playlist"
      profileUrl={playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : ""}
      items={items}
      platform="YOUTUBE"
      platformColor="#FF0000"
      platformIcon={<YouTubeIcon />}
    />
  );
}
