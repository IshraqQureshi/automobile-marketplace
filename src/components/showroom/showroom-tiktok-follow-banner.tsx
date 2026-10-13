import { TikTokIcon } from "@/components/ui/social-icons";

interface ShowroomTikTokFollowBannerProps {
  businessName: string;
  tiktokUrl: string | null;
  hasVideoHighlights: boolean;
}

/**
 * A lone "Follow on TikTok" banner for when ShowroomTikTokHighlights (the
 * real video grid) has nothing to show — no pasted videos, or every pasted
 * video failed to resolve (deleted/private/a TikTok API hiccup) — so a
 * showroom with a configured tiktok_url still has some way to reach it.
 * This file previously also hosted the showroom's single embedded YouTube
 * "videoseries" iframe (as ShowroomPlaylistSection); that's now
 * ShowroomYoutubeHighlights, its own per-video card grid.
 */
export function ShowroomTikTokFollowBanner({ businessName, tiktokUrl, hasVideoHighlights }: ShowroomTikTokFollowBannerProps) {
  if (tiktokUrl == null || hasVideoHighlights) return null;

  return (
    <section className="bg-neutral-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">Follow us</p>
            <h2 className="font-display text-xl font-bold text-white">{businessName} Videos</h2>
          </div>
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <TikTokIcon />
            Follow on TikTok
          </a>
        </div>
      </div>
    </section>
  );
}
