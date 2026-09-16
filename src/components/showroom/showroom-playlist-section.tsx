import { TikTokIcon } from "@/components/ui/social-icons";
import { getTikTokEmbedUrl, getYouTubePlaylistEmbedUrl } from "@/lib/video-embed";

interface ShowroomPlaylistSectionProps {
  businessName: string;
  playlistUrl: string | null;
  tiktokUrl: string | null;
  tiktokVideoUrls: string[] | null;
}

/**
 * The showroom's public YouTube presence is a single admin-set playlist URL
 * (from the real HarakaGari channel), embedded directly — no owner
 * curation step, no per-video modal, just YouTube's own "videoseries"
 * playlist embed (replaces the previous owner-managed "grid of individual
 * videos" section, ShowroomVideoSection, now unused). tiktokUrl/
 * tiktokVideoUrls are separate, owner-editable fields (the showroom's own
 * account, not HarakaGari-curated) — a follow link plus up to 4
 * individually-pasted video embeds (via getTikTokEmbedUrl, the same real
 * `tiktok.com/embed/v2/{id}` iframe already used by the homepage's own
 * highlight modal), shown regardless of whether a playlist is configured,
 * so a showroom with only a TikTok presence (no playlist) still gets this
 * section. Deliberately manual, not an API-pulled "latest N videos" feed
 * — that would need TikTok's OAuth Display API (per-showroom login/
 * consent, token storage), the same tradeoff already made for YouTube in
 * favor of a manually-set URL. A video whose URL can't be resolved to an
 * embeddable ID (e.g. a short/shared vm.tiktok.com link — see
 * getTikTokEmbedUrl's own comment) is silently dropped rather than
 * rendering a broken iframe.
 */
export function ShowroomPlaylistSection({ businessName, playlistUrl, tiktokUrl, tiktokVideoUrls }: ShowroomPlaylistSectionProps) {
  const embedUrl = playlistUrl ? getYouTubePlaylistEmbedUrl(playlistUrl) : null;
  const videoEmbedUrls = (tiktokVideoUrls ?? []).map(getTikTokEmbedUrl).filter((url): url is string => url != null);
  if (!embedUrl && !tiktokUrl && videoEmbedUrls.length === 0) return null;

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

        {videoEmbedUrls.length > 0 && (
          <div className={embedUrl ? "mt-8" : undefined}>
            {embedUrl && <p className="mb-4 text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">On TikTok</p>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {videoEmbedUrls.map((url) => (
                <div key={url} className="overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "9 / 16" }}>
                  <iframe
                    src={url}
                    title={`${businessName} — TikTok video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
