import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ShowroomVehicleBrowser } from "@/components/showroom/showroom-vehicle-browser";
import { ShowroomVideoSection } from "@/components/showroom/showroom-video-section";
import { getShowroomDetailPath, parseShowroomIdFromSlug } from "@/features/showroom/slug";
import { buildWhatsAppLink } from "@/features/showroom/whatsapp";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";
import { getSystemSettingString } from "@/lib/system-settings";
import { buildBreadcrumbListJsonLd } from "@/lib/structured-data";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

const dateFormatter = new Intl.DateTimeFormat("en-KE", { year: "numeric" });

interface ShowroomDetailPageProps {
  params: Promise<{ slug: string }>;
}

// generateMetadata and the page component both need this same showroom —
// cache() (React's per-request memoization) means the second call within
// the same request reuses the first's result, same convention as the
// vehicle detail page's own getVehicle().
const getShowroomData = cache(async (id: string) => {
  const supabase = await createClient();

  // Public visibility requires status = 'APPROVED', same rule
  // showrooms_select_public_or_owner_or_admin enforces at the RLS level —
  // this filters explicitly rather than relying on RLS alone, so a
  // PENDING/REJECTED/SUSPENDED showroom's page 404s instead of silently
  // returning no row for an unrelated reason.
  const { data: showroom } = await supabase
    .from("showrooms")
    .select(
      "id, business_name, city, address, phone, latitude, longitude, description, opening_hours, verified, created_at, logo_storage_path, youtube_channel_url",
    )
    .eq("id", id)
    .eq("status", "APPROVED")
    .maybeSingle();
  if (!showroom) return null;

  const [{ data: vehicleRows }, whatsappNumber, { data: videoRows }] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_SELECT_COLUMNS).eq("showroom_id", id).eq("status", "ACTIVE").order("created_at", { ascending: false }),
    getSystemSettingString(supabase, "whatsapp_contact_number"),
    supabase.from("showroom_videos").select("id, title, video_url").eq("showroom_id", id).order("sort_order", { ascending: true }),
  ]);

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const vehicles: VehicleWithShowroom[] = (vehicleRows ?? []).map((row) => ({
    ...vehicleRowToListItem(row, getPhotoUrl),
    showroomId: showroom.id,
    showroomName: showroom.business_name,
  }));

  const videos = (videoRows ?? []).map((row) => ({ id: row.id, title: row.title, videoUrl: row.video_url }));

  const logoUrl = showroom.logo_storage_path ? supabase.storage.from("showroom-logos").getPublicUrl(showroom.logo_storage_path).data.publicUrl : null;

  return { showroom, vehicles, whatsappNumber, logoUrl, videos };
});

export async function generateMetadata({ params }: ShowroomDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseShowroomIdFromSlug(slug);
  const result = id ? await getShowroomData(id) : null;
  if (!result) return { title: "Showroom not found — HarakaGari" };

  const { showroom, logoUrl } = result;
  const title = `${showroom.business_name} — HarakaGari`;
  const description = showroom.description || `Browse vehicle listings from ${showroom.business_name} on HarakaGari.`;
  const path = getShowroomDetailPath({ id: showroom.id, businessName: showroom.business_name });
  return {
    title,
    description,
    alternates: { canonical: path },
    // A page that sets its own `openGraph` object entirely replaces the
    // root layout's file-convention default image rather than merging with
    // it (confirmed live — the same gap the homepage had) — `images` must
    // be set explicitly here (not left undefined and assumed to inherit),
    // falling back to the site default when this showroom has no logo.
    openGraph: { title, description, url: path, images: [logoUrl ?? "/opengraph-image"] },
  };
}

export default async function ShowroomDetailPage({ params }: ShowroomDetailPageProps) {
  const { slug } = await params;
  const id = parseShowroomIdFromSlug(slug);
  if (!id) notFound();

  const result = await getShowroomData(id);
  if (!result) notFound();
  const { showroom, vehicles, whatsappNumber, logoUrl, videos } = result;

  // Canonicalize: a stale/guessed name-slug (e.g. copied before a rename)
  // still resolves by id, but redirects to the real URL rather than serving
  // duplicate content at two paths — same B-009-affected pattern as the
  // vehicle detail page (content resolves correctly regardless; only the
  // address bar itself doesn't visibly update, a known pre-existing gap).
  const canonicalPath = getShowroomDetailPath({ id: showroom.id, businessName: showroom.business_name });
  if (`/showrooms/${slug}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const whatsappLink = buildWhatsAppLink(whatsappNumber, `Hi, I'm interested in vehicles from ${showroom.business_name} on HarakaGari.`);
  const openingHours = typeof showroom.opening_hours === "string" ? showroom.opening_hours : null;

  // AutoDealer (schema.org's dedicated type for a car dealership, a more
  // specific LocalBusiness subtype) — phone/address/geo are all real
  // columns on this exact row, not fabricated; opening_hours is stored as
  // free text (not per-day structured data), so it's deliberately not
  // forced into schema.org's openingHoursSpecification microformat, which
  // would misrepresent it as machine-structured when it isn't.
  const autoDealerJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: showroom.business_name,
    url: `${publicEnv.NEXT_PUBLIC_SITE_URL}${canonicalPath}`,
    ...(logoUrl ? { image: logoUrl } : {}),
    ...(showroom.description ? { description: showroom.description } : {}),
    telephone: showroom.phone,
    ...(showroom.city || showroom.address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(showroom.address ? { streetAddress: showroom.address } : {}),
            ...(showroom.city ? { addressLocality: showroom.city } : {}),
            addressCountry: "KE",
          },
        }
      : {}),
    ...(showroom.latitude != null && showroom.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: showroom.latitude, longitude: showroom.longitude } }
      : {}),
  };
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: "Home", path: "/" },
    { name: "Showrooms", path: "/showrooms" },
    { name: showroom.business_name, path: canonicalPath },
  ]);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(autoDealerJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="border-b border-neutral-200 bg-white px-6 py-2.5 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 text-xs text-neutral-400">
          <Link href="/" className="text-neutral-500 no-underline hover:text-neutral-700">
            Home
          </Link>
          <span className="text-neutral-300">/</span>
          <Link href="/showrooms" className="text-neutral-500 no-underline hover:text-neutral-700">
            Showrooms
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="font-medium text-neutral-900">{showroom.business_name}</span>
        </div>
      </nav>

      <div className="border-b border-neutral-200 bg-white px-6 pt-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 pb-6 md:flex-row md:items-end">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={showroom.business_name}
                width={112}
                height={112}
                unoptimized
                className="h-24 w-24 shrink-0 rounded-xl border-4 border-white object-contain shadow-lg md:h-28 md:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-4 border-white bg-brand text-3xl font-bold text-white shadow-lg md:h-28 md:w-28">
                {getInitials(showroom.business_name)}
              </div>
            )}

            <div className="min-w-0 flex-1 pt-3 md:pt-0 md:pb-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-neutral-900">{showroom.business_name}</h1>
                {showroom.verified && (
                  <span className="flex items-center gap-1 rounded-full border border-[#99e6df] bg-[#f0fdf9] px-2 py-0.5 text-[10px] font-semibold text-brand">
                    <VerifiedIcon />
                    Verified Dealer
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                {showroom.city && (
                  <span className="flex items-center gap-1">
                    <PinIcon />
                    {showroom.city}
                  </span>
                )}
                {openingHours && (
                  <span className="flex items-center gap-1">
                    <ClockIcon />
                    {openingHours}
                  </span>
                )}
                {/* Real, structured contact info (not just the WhatsApp CTA
                    below) — also referenced as `telephone` in this page's
                    AutoDealer JSON-LD, so the schema actually reflects
                    something a visitor can see, not just machine-readable
                    data with no visible counterpart. */}
                <a href={`tel:${showroom.phone}`} className="flex items-center gap-1 text-neutral-500 no-underline hover:text-neutral-700">
                  <PhoneIcon />
                  {showroom.phone}
                </a>
                <span className="flex items-center gap-1">
                  <CalendarIcon />
                  Member since {dateFormatter.format(new Date(showroom.created_at))}
                </span>
              </div>
            </div>

            <div className="shrink-0 md:pb-1">
              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <MessageIcon />
                  Message
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="WhatsApp contact number not configured yet"
                  className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-400 disabled:cursor-not-allowed"
                >
                  <MessageIcon />
                  Message
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="px-6 py-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <ShowroomVehicleBrowser vehicles={vehicles} />
        </div>
      </section>

      <ShowroomVideoSection businessName={showroom.business_name} channelUrl={showroom.youtube_channel_url} videos={videos} />
    </div>
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

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
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

function MessageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
