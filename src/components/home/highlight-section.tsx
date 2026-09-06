"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { getTikTokEmbedUrl, getYouTubeEmbedUrl } from "@/lib/video-embed";

export interface HighlightCardItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
}

interface HighlightSectionProps {
  eyebrow: string;
  heading: string;
  subtitle: string;
  handleLabel: string;
  profileUrl: string;
  items: HighlightCardItem[];
  platform: "TIKTOK" | "YOUTUBE";
  platformColor: string;
  platformIcon: React.ReactNode;
}

/**
 * Shared shape for the homepage's "Watch & Discover" (TikTok) and "Reviews &
 * Guides" (YouTube) sections — same layout, different copy/data/accent
 * color, so one parameterized component rather than two near-identical
 * ones. Content is admin-curated (src/app/admin/(protected)/highlights) —
 * static/manually-curated per MVP_REQUIREMENTS.md §4.1/§29.1, no live
 * TikTok/YouTube API integration. No view-count/handle row (unlike the
 * design mockup) — that data isn't real/available without a live API,
 * which is explicitly out of scope, so it isn't fabricated here.
 *
 * Cards open the real admin-pasted video in an in-page modal (embedding the
 * actual video, not a live API lookup) rather than navigating away — only
 * the "@Handle" profile link still opens the real external
 * TikTok/YouTube channel in a new tab.
 */
export function HighlightSection({
  eyebrow,
  heading,
  subtitle,
  handleLabel,
  profileUrl,
  items,
  platform,
  platformColor,
  platformIcon,
}: HighlightSectionProps) {
  const [activeItem, setActiveItem] = useState<HighlightCardItem | null>(null);

  if (items.length === 0) return null;

  const embedUrl = activeItem ? (platform === "TIKTOK" ? getTikTokEmbedUrl(activeItem.videoUrl) : getYouTubeEmbedUrl(activeItem.videoUrl)) : null;

  return (
    <section className="bg-ink px-6 py-14 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-white/35 uppercase">{eyebrow}</p>
            <h2 className="font-display text-3xl font-bold text-white">{heading}</h2>
            <p className="mt-1.5 text-sm text-white/45">{subtitle}</p>
          </div>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2.5 self-start rounded-md px-5 py-2.5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 md:self-auto"
              style={{ backgroundColor: platformColor }}
            >
              {platformIcon}
              {handleLabel}
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveItem(item)}
              className="group relative block overflow-hidden rounded-xl bg-[#1a1f2e] text-left"
              style={{ aspectRatio: "9 / 16", maxHeight: "420px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied Storage thumbnail, no build-time-known dimensions */}
              <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)", opacity: 0.7 }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/50 bg-white/18 backdrop-blur-sm">
                  <PlayIcon />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <p className="mb-1 text-[11px] leading-snug font-semibold text-white">{item.title}</p>
              </div>
              <div className="absolute top-3 right-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: platformColor }}>
                  {platformIcon}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={activeItem != null} onClose={() => setActiveItem(null)} title={activeItem?.title ?? ""} size="lg">
        {embedUrl ? (
          <div
            className="mx-auto overflow-hidden rounded-lg bg-black"
            style={platform === "TIKTOK" ? { aspectRatio: "9 / 16", maxHeight: "70vh", width: "fit-content" } : { aspectRatio: "16 / 9" }}
          >
            <iframe
              src={embedUrl}
              title={activeItem?.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              style={platform === "TIKTOK" ? { aspectRatio: "9 / 16", height: "70vh" } : undefined}
            />
          </div>
        ) : (
          activeItem && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-neutral-500">This video can&apos;t be embedded directly — watch it on the original platform instead.</p>
              <a
                href={activeItem.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-5 py-2.5 text-sm font-semibold text-white no-underline"
                style={{ backgroundColor: platformColor }}
              >
                Watch on {platform === "TIKTOK" ? "TikTok" : "YouTube"} →
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
    <svg viewBox="0 0 24 24" fill="#fff" className="ml-0.5 h-5.5 w-5.5" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
