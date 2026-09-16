import type { HighlightCardItem } from "@/components/home/highlight-section";
import { HighlightSection } from "@/components/home/highlight-section";
import { TikTokIcon } from "@/components/ui/social-icons";
import { fetchTikTokOEmbed } from "@/lib/tiktok-oembed";

/**
 * Resolves a showroom's pasted TikTok video links into real, renderable
 * highlight cards — split out from the presentational component below so
 * the caller (the showroom detail page) can see the REAL resolved count
 * before deciding whether ShowroomPlaylistSection's own "Follow on
 * TikTok" button is redundant. Using video URL *presence* for that
 * decision instead of actual resolution success was a real bug found in
 * code review: if every configured video fails to resolve (deleted/
 * private/a temporary TikTok API hiccup), both this section and the
 * fallback follow button would disappear, leaving no way to reach the
 * showroom's TikTok at all even though a valid tiktok_url was set.
 */
export async function resolveShowroomTikTokHighlights(videoUrls: string[] | null): Promise<HighlightCardItem[]> {
  const urls = videoUrls ?? [];
  if (urls.length === 0) return [];

  const resolved = await Promise.all(urls.map(async (url) => ({ url, data: await fetchTikTokOEmbed(url) })));
  return resolved
    .filter((entry): entry is { url: string; data: NonNullable<typeof entry.data> } => entry.data != null)
    .map((entry) => ({ id: entry.url, title: entry.data.title, videoUrl: entry.url, thumbnailUrl: entry.data.thumbnailUrl }));
}

interface ShowroomTikTokHighlightsProps {
  businessName: string;
  tiktokUrl: string | null;
  items: HighlightCardItem[];
}

/**
 * Renders a showroom's already-resolved TikTok video links (see
 * resolveShowroomTikTokHighlights) using the exact same thumbnail-grid +
 * click-to-play-modal layout as the homepage's admin-curated "Watch &
 * Discover" section (HighlightSection) — per direct request, not the
 * earlier always-loaded inline-iframe grid this replaced.
 */
export function ShowroomTikTokHighlights({ businessName, tiktokUrl, items }: ShowroomTikTokHighlightsProps) {
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
