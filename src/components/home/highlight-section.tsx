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
  platformBadgeClassName: string;
  platformIcon: React.ReactNode;
}

/**
 * Shared shape for the homepage's "Watch & Discover" (TikTok) and "Reviews &
 * Guides" (YouTube) sections — same layout, different copy/data/accent
 * color, so one parameterized component rather than two near-identical
 * ones. Content is admin-curated (src/app/admin/(protected)/highlights) —
 * static/manually-curated per MVP_REQUIREMENTS.md §4.1/§29.1, no live
 * TikTok/YouTube API integration.
 */
export function HighlightSection({
  eyebrow,
  heading,
  subtitle,
  handleLabel,
  profileUrl,
  items,
  platformBadgeClassName,
  platformIcon,
}: HighlightSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-ink px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-white/50 uppercase">{eyebrow}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
          </div>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${platformBadgeClassName}`}
            >
              {handleLabel}
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-[9/16] overflow-hidden rounded-xl bg-neutral-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied Storage thumbnail, no build-time-known dimensions */}
              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              <span className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full ${platformBadgeClassName}`}>
                {platformIcon}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
