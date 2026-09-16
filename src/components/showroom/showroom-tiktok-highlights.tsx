import { HighlightSection } from "@/components/home/highlight-section";
import { TikTokIcon } from "@/components/ui/social-icons";
import { fetchTikTokOEmbed } from "@/lib/tiktok-oembed";

interface ShowroomTikTokHighlightsProps {
  businessName: string;
  tiktokUrl: string | null;
  videoUrls: string[] | null;
}

/**
 * Renders a showroom's own pasted TikTok video links using the exact same
 * thumbnail-grid + click-to-play-modal layout as the homepage's admin-
 * curated "Watch & Discover" section (HighlightSection) — per direct
 * request, not the earlier always-loaded inline-iframe grid this replaced.
 * The homepage's own version gets its title/thumbnail from an admin-typed
 * table; this fetches the real ones from TikTok's own oEmbed endpoint
 * instead (fetchTikTokOEmbed), since there's no admin curation step here —
 * a video that can't be resolved (deleted/private/malformed URL) is
 * dropped rather than shown with a fabricated placeholder thumbnail.
 */
export async function ShowroomTikTokHighlights({ businessName, tiktokUrl, videoUrls }: ShowroomTikTokHighlightsProps) {
  const urls = videoUrls ?? [];
  if (urls.length === 0) return null;

  const resolved = await Promise.all(urls.map(async (url) => ({ url, data: await fetchTikTokOEmbed(url) })));
  const items = resolved
    .filter((entry): entry is { url: string; data: NonNullable<typeof entry.data> } => entry.data != null)
    .map((entry) => ({ id: entry.url, title: entry.data.title, videoUrl: entry.url, thumbnailUrl: entry.data.thumbnailUrl }));

  if (items.length === 0) return null;

  return (
    <HighlightSection
      eyebrow="On TikTok"
      heading={`${businessName} Videos`}
      subtitle="Watch more from this showroom on TikTok"
      handleLabel="Follow on TikTok"
      profileUrl={tiktokUrl ?? ""}
      items={items}
      platform="TIKTOK"
      platformColor="#FF2D55"
      platformIcon={<TikTokIcon />}
    />
  );
}
