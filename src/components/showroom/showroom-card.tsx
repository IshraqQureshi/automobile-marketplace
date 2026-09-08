import Image from "next/image";
import Link from "next/link";
import { getShowroomDetailPath } from "@/features/showroom/slug";

export interface ShowroomCardData {
  id: string;
  businessName: string;
  city: string | null;
  description: string | null;
  verified: boolean;
  logoUrl: string | null;
  activeVehicleCount: number;
}

interface ShowroomCardProps {
  showroom: ShowroomCardData;
}

/**
 * The showroom directory's card. Two per row (see the grid in
 * showrooms/page.tsx) reads better than a cramped three-up grid for a
 * card carrying this much content (logo, name, city, badge, description,
 * stat row) — a dense 3-column layout was truncating almost everything.
 * Visual language mirrors the showroom detail page's own logo/initials +
 * "Verified Dealer" badge treatment (design/showroom-detail.png), not a
 * fresh invention, since no mockup exists for a listing/directory page
 * itself.
 */
export function ShowroomCard({ showroom }: ShowroomCardProps) {
  const href = getShowroomDetailPath({ id: showroom.id, businessName: showroom.businessName });
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 no-underline transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        {showroom.logoUrl ? (
          <Image
            src={showroom.logoUrl}
            alt={showroom.businessName}
            width={72}
            height={72}
            unoptimized
            className="h-18 w-18 shrink-0 rounded-xl border border-neutral-100 object-contain"
          />
        ) : (
          <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand to-brand-dark text-xl font-bold text-white">
            {getInitials(showroom.businessName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-bold text-neutral-900 group-hover:text-brand">{showroom.businessName}</h3>
            {showroom.verified && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#99e6df] bg-[#f0fdf9] px-2 py-0.5 text-[10px] font-semibold text-brand">
                <VerifiedIcon />
                Verified
              </span>
            )}
          </div>
          {showroom.city && (
            <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
              <PinIcon />
              {showroom.city}
            </p>
          )}
        </div>
      </div>

      {showroom.description && <p className="line-clamp-2 text-sm leading-relaxed text-neutral-500">{showroom.description}</p>}

      <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-600">
          <CarIcon />
          {showroom.activeVehicleCount} vehicle{showroom.activeVehicleCount === 1 ? "" : "s"} listed
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-brand">
          View Showroom
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM3 17V9l2-5h14l2 5v8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
