"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/video-embed";

export interface ShowroomVideoItem {
  id: string;
  title: string;
  videoUrl: string;
}

interface ShowroomVideoSectionProps {
  businessName: string;
  channelUrl: string | null;
  videos: ShowroomVideoItem[];
}

/**
 * A showroom's own YouTube presence on its public detail page — a grid of
 * every video the owner has added (owner-managed, `showroom_videos`, one-to-
 * many) plus an optional "View Channel" link, opening the clicked video in
 * an in-page modal. Same grid-plus-modal shape as the homepage's own
 * HighlightSection, but thumbnails come straight from YouTube's own static
 * thumbnail CDN (getYouTubeThumbnailUrl) rather than an admin-uploaded
 * image — there's no per-showroom curation step here, just a pasted URL.
 */
export function ShowroomVideoSection({ businessName, channelUrl, videos }: ShowroomVideoSectionProps) {
  const [activeVideo, setActiveVideo] = useState<ShowroomVideoItem | null>(null);

  if (videos.length === 0 && !channelUrl) return null;

  const embedUrl = activeVideo ? getYouTubeEmbedUrl(activeVideo.videoUrl) : null;

  return (
    <section className="bg-neutral-950 px-6 py-10 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">On YouTube</p>
            <h2 className="font-display text-xl font-bold text-white">{businessName} Videos</h2>
          </div>
          {channelUrl && (
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md bg-[#ff0000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#cc0000]"
            >
              <YouTubeIcon />
              View Channel
            </a>
          )}
        </div>

        {videos.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {videos.map((video) => {
              const thumbnailUrl = getYouTubeThumbnailUrl(video.videoUrl);
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setActiveVideo(video)}
                  className="group relative block overflow-hidden rounded-xl bg-[#1a1f2e] text-left"
                  style={{ aspectRatio: "16 / 9" }}
                >
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- YouTube-hosted thumbnail, no build-time-known dimensions
                    <img src={thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      <YouTubeIcon />
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)", opacity: 0.7 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/50 bg-white/18 backdrop-blur-sm">
                      <PlayIcon />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="line-clamp-2 text-[11px] leading-snug font-semibold text-white">{video.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={activeVideo != null} onClose={() => setActiveVideo(null)} title={activeVideo?.title ?? ""} size="lg">
        {embedUrl ? (
          <div className="mx-auto overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9" }}>
            <iframe src={embedUrl} title={activeVideo?.title} allow="autoplay; encrypted-media" allowFullScreen className="h-full w-full" />
          </div>
        ) : (
          activeVideo && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-neutral-500">This video can&apos;t be embedded directly — watch it on YouTube instead.</p>
              <a
                href={activeVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-[#ff0000] px-5 py-2.5 text-sm font-semibold text-white no-underline"
              >
                Watch on YouTube →
              </a>
            </div>
          )
        )}
      </Dialog>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" className="ml-0.5 h-5 w-5" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}
