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
 * The showroom directory's card — visual language deliberately mirrors the
 * showroom detail page's own logo/initials + "Verified Dealer" badge
 * treatment (design/showroom-detail.png), not a fresh invention, since no
 * mockup exists for a listing/directory page itself.
 */
export function ShowroomCard({ showroom }: ShowroomCardProps) {
  const href = getShowroomDetailPath({ id: showroom.id, businessName: showroom.businessName });
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm no-underline transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {showroom.logoUrl ? (
          <Image
            src={showroom.logoUrl}
            alt={showroom.businessName}
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 shrink-0 rounded-lg border border-neutral-100 object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">
            {getInitials(showroom.businessName)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-neutral-900">{showroom.businessName}</p>
          {showroom.city && (
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <PinIcon />
              {showroom.city}
            </p>
          )}
        </div>
      </div>

      {showroom.verified && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[#99e6df] bg-[#f0fdf9] px-2 py-0.5 text-[10px] font-semibold text-brand">
          <VerifiedIcon />
          Verified Dealer
        </span>
      )}

      {showroom.description && <p className="line-clamp-2 text-sm text-neutral-500">{showroom.description}</p>}

      <p className="mt-auto text-xs font-medium text-neutral-400">
        {showroom.activeVehicleCount} vehicle{showroom.activeVehicleCount === 1 ? "" : "s"} listed
      </p>
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
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
