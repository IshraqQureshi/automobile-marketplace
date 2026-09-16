import { TikTokIcon } from "@/components/ui/social-icons";
import { getYouTubePlaylistEmbedUrl } from "@/lib/video-embed";

interface ShowroomPlaylistSectionProps {
  businessName: string;
  playlistUrl: string | null;
  tiktokUrl: string | null;
}

/**
 * The showroom's public YouTube presence is a single admin-set playlist URL
 * (from the real HarakaGari channel), embedded directly — no owner
 * curation step, no per-video modal, just YouTube's own "videoseries"
 * playlist embed (replaces the previous owner-managed "grid of individual
 * videos" section, ShowroomVideoSection, now unused). tiktokUrl is a
 * separate, owner-editable field (the showroom's own account, not
 * HarakaGari-curated) — shown as a simple follow link right below,
 * regardless of whether a playlist is configured, so a showroom with only
 * a TikTok account (no playlist) still gets this section.
 */
export function ShowroomPlaylistSection({ businessName, playlistUrl, tiktokUrl }: ShowroomPlaylistSectionProps) {
  const embedUrl = playlistUrl ? getYouTubePlaylistEmbedUrl(playlistUrl) : null;
  if (!embedUrl && !tiktokUrl) return null;

  return (
    <section className="bg-neutral-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">{embedUrl ? "On YouTube" : "Follow us"}</p>
            <h2 className="font-display text-xl font-bold text-white">{businessName} Videos</h2>
          </div>
          {tiktokUrl && (
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              <TikTokIcon />
              Follow on TikTok
            </a>
          )}
        </div>

        {embedUrl && (
          <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
            <iframe src={embedUrl} title={`${businessName} — YouTube playlist`} allow="encrypted-media" allowFullScreen className="h-full w-full" />
          </div>
        )}
      </div>
    </section>
  );
}
