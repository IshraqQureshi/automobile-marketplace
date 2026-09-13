import { getYouTubePlaylistEmbedUrl } from "@/lib/video-embed";

interface ShowroomPlaylistSectionProps {
  businessName: string;
  playlistUrl: string | null;
}

/**
 * Replaces the previous owner-managed "grid of individual videos" section
 * (ShowroomVideoSection, now unused) per direct request: a showroom's
 * public YouTube presence is now a single admin-set playlist URL (from the
 * real HarakaGari channel), embedded directly — no owner curation step, no
 * per-video modal, just YouTube's own "videoseries" playlist embed.
 */
export function ShowroomPlaylistSection({ businessName, playlistUrl }: ShowroomPlaylistSectionProps) {
  if (!playlistUrl) return null;
  const embedUrl = getYouTubePlaylistEmbedUrl(playlistUrl);
  if (!embedUrl) return null;

  return (
    <section className="bg-neutral-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">On YouTube</p>
          <h2 className="font-display text-xl font-bold text-white">{businessName} Videos</h2>
        </div>

        <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
          <iframe src={embedUrl} title={`${businessName} — YouTube playlist`} allow="encrypted-media" allowFullScreen className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}
