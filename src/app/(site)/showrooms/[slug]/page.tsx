import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ShowroomVehicleBrowser } from "@/components/showroom/showroom-vehicle-browser";
import { getShowroomDetailPath, parseShowroomIdFromSlug } from "@/features/showroom/slug";
import { buildWhatsAppLink } from "@/features/showroom/whatsapp";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";
import { getSystemSettingString } from "@/lib/system-settings";
import { getYouTubeEmbedUrl } from "@/lib/video-embed";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, business_name, city, description, opening_hours, verified, created_at, logo_storage_path, youtube_channel_url, youtube_video_url")
    .eq("id", id)
    .eq("status", "APPROVED")
    .maybeSingle();
  if (!showroom) return null;

  const [{ data: vehicleRows }, whatsappNumber] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_SELECT_COLUMNS).eq("showroom_id", id).eq("status", "ACTIVE").order("created_at", { ascending: false }),
    getSystemSettingString(supabase, "whatsapp_contact_number"),
  ]);

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const vehicles: VehicleWithShowroom[] = (vehicleRows ?? []).map((row) => ({
    ...vehicleRowToListItem(row, getPhotoUrl),
    showroomId: showroom.id,
    showroomName: showroom.business_name,
  }));

  const logoUrl = showroom.logo_storage_path ? supabase.storage.from("showroom-logos").getPublicUrl(showroom.logo_storage_path).data.publicUrl : null;

  return { showroom, vehicles, whatsappNumber, logoUrl };
});

export async function generateMetadata({ params }: ShowroomDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseShowroomIdFromSlug(slug);
  const result = id ? await getShowroomData(id) : null;
  if (!result) return { title: "Showroom not found — HarakaGari" };

  const { showroom } = result;
  const title = `${showroom.business_name} — HarakaGari`;
  const description = showroom.description || `Browse vehicle listings from ${showroom.business_name} on HarakaGari.`;
  const path = getShowroomDetailPath({ id: showroom.id, businessName: showroom.business_name });
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export default async function ShowroomDetailPage({ params }: ShowroomDetailPageProps) {
  const { slug } = await params;
  const id = parseShowroomIdFromSlug(slug);
  if (!id) notFound();

  const result = await getShowroomData(id);
  if (!result) notFound();
  const { showroom, vehicles, whatsappNumber, logoUrl } = result;

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
  const videoEmbedUrl = showroom.youtube_video_url ? getYouTubeEmbedUrl(showroom.youtube_video_url, { autoplay: false }) : null;
  const hasYouTubeSection = Boolean(showroom.youtube_channel_url || videoEmbedUrl);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
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

      {hasYouTubeSection && (
        <section className="bg-neutral-950 px-6 py-10 md:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">On YouTube</p>
                <h2 className="font-display text-xl font-bold text-white">{showroom.business_name} Videos</h2>
              </div>
              {showroom.youtube_channel_url && (
                <a
                  href={showroom.youtube_channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md bg-[#ff0000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#cc0000]"
                >
                  <YouTubeIcon />
                  View Channel
                </a>
              )}
            </div>
            {videoEmbedUrl && (
              <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl">
                <iframe
                  src={videoEmbedUrl}
                  title={`${showroom.business_name} featured video`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
        </section>
      )}
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

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}
