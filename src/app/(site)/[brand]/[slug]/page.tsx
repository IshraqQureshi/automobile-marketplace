import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { FinancingCalculator } from "@/components/vehicle/financing-calculator";
import { VehicleGallery } from "@/components/vehicle/vehicle-gallery";
import { currencyFormatter, VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";
import { getVehicleDetailPath, parseVehicleIdFromSlug } from "@/features/vehicle/slug";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const mileageFormatter = new Intl.NumberFormat("en-KE");
const viewFormatter = new Intl.NumberFormat("en-KE");
const SIMILAR_VEHICLES_LIMIT = 4;

interface VehicleDetailPageProps {
  params: Promise<{ brand: string; slug: string }>;
}

// generateMetadata and the page component both need this same vehicle —
// cache() (React's per-request memoization) means the second call within
// the same request reuses the first's result instead of a duplicate
// Supabase round-trip.
const getVehicle = cache(async (id: string) => {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("vehicles")
    .select(`${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name, city, verified, created_at)`)
    .eq("id", id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!row) return null;

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const vehicle: VehicleWithShowroom = {
    ...vehicleRowToListItem(row, getPhotoUrl),
    showroomId: row.showroom_id,
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  };

  return { vehicle, showroom: row.showrooms, supabase };
});

export async function generateMetadata({ params }: VehicleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseVehicleIdFromSlug(slug);
  const result = id ? await getVehicle(id) : null;
  if (!result) return { title: "Vehicle not found — HarakaGari" };

  const { vehicle } = result;
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} — HarakaGari`;
  const description = `${currencyFormatter.format(vehicle.price)} — ${vehicle.mileage != null ? `${mileageFormatter.format(vehicle.mileage)} km` : "Mileage n/a"} — listed by ${vehicle.showroomName}.`;
  return {
    title,
    description,
    alternates: { canonical: getVehicleDetailPath(vehicle) },
    openGraph: { title, description, url: getVehicleDetailPath(vehicle), images: vehicle.photos[0] ? [vehicle.photos[0].url] : undefined },
  };
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { brand, slug } = await params;
  const id = parseVehicleIdFromSlug(slug);
  if (!id) notFound();

  const result = await getVehicle(id);
  if (!result) notFound();

  const { vehicle, showroom, supabase } = result;

  // Canonicalize: a stale/guessed brand segment (or a name-slug that's gone
  // stale after a title edit) still resolves by id, but redirects to the
  // real URL rather than serving duplicate content at two paths.
  //
  // KNOWN LIMITATION (B-009, same root cause as notFound() returning 200):
  // the app-wide root src/app/loading.tsx starts streaming this route's 200
  // response before this redirect() call can turn into a real HTTP 3xx —
  // confirmed live that the *content* still resolves correctly (the real
  // vehicle renders), but the browser's address bar doesn't actually change
  // to the canonical URL. Not a functional bug (no wrong data shown), but a
  // real SEO/duplicate-content gap until B-009 is fixed.
  const canonicalPath = getVehicleDetailPath(vehicle);
  if (`/${brand}/${slug}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const [{ count: activeListingCount }, { data: similarRows }] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", vehicle.showroomId).eq("status", "ACTIVE"),
    supabase
      .from("vehicles")
      .select(`${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name)`)
      .eq("status", "ACTIVE")
      .eq("make", vehicle.make)
      .neq("id", vehicle.id)
      .limit(SIMILAR_VEHICLES_LIMIT),
    // Real, not-deduplicated view count — see 20260906020000_add_vehicle_view_count.sql.
    // Fire-and-forget from the page's perspective (renders with the
    // pre-increment count already loaded above; the +1 shows up on the
    // *next* visit) rather than blocking the render on a write.
    supabase.rpc("increment_vehicle_view_count", { target_vehicle_id: vehicle.id }),
  ]);

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const similarVehicles: VehicleWithShowroom[] = (similarRows ?? []).map((row) => ({
    ...vehicleRowToListItem(row, getPhotoUrl),
    showroomId: row.showroom_id,
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    brand: vehicle.make,
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: vehicle.mileage ?? undefined,
    offers: { "@type": "Offer", price: vehicle.price, priceCurrency: "KES", availability: "https://schema.org/InStock" },
  };

  const hasRealFinancing =
    (vehicle.bankFinanceEnabled || vehicle.installmentEnabled) &&
    vehicle.financingInterestRate != null &&
    vehicle.financingTenureMonths != null &&
    vehicle.financingTenureMonths.length > 0;

  const bodyTypePlural = vehicle.bodyType ? `${vehicle.bodyType}s` : null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="border-b border-neutral-200 bg-white px-6 py-2.5 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 text-xs text-neutral-400">
          <Link href="/" className="text-neutral-500 no-underline hover:text-neutral-700">
            Home
          </Link>
          <span className="text-neutral-300">/</span>
          <Link href="/listing" className="text-neutral-500 no-underline hover:text-neutral-700">
            Listing
          </Link>
          {bodyTypePlural && (
            <>
              <span className="text-neutral-300">/</span>
              <Link href={`/listing?bodyType=${encodeURIComponent(vehicle.bodyType!)}`} className="text-neutral-500 no-underline hover:text-neutral-700">
                {bodyTypePlural}
              </Link>
            </>
          )}
          <span className="text-neutral-300">/</span>
          <Link href={`/listing?make=${encodeURIComponent(vehicle.make)}`} className="text-neutral-500 no-underline hover:text-neutral-700">
            {vehicle.make}
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="font-medium text-neutral-900">{vehicle.model}</span>
        </div>
      </nav>

      <main className="px-6 py-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold tracking-widest text-brand uppercase">{vehicle.make}</span>
                <span className="h-1 w-1 rounded-full bg-neutral-300" />
                <span className="text-xs font-medium text-neutral-400">{vehicle.year}</span>
              </div>
              <h1 className="mb-2 text-2xl leading-tight font-bold tracking-tight text-neutral-900 md:text-3xl">
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.variant ? ` ${vehicle.variant}` : ""}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                {showroom?.city && (
                  <span className="flex items-center gap-1.5">
                    <PinIcon />
                    {showroom.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <ClockIcon />
                  Listed {dateFormatter.format(new Date(vehicle.createdAt))}
                </span>
                <span className="flex items-center gap-1.5">
                  <EyeIcon />
                  {viewFormatter.format(vehicle.viewCount)} view{vehicle.viewCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled
                title="Favorites — coming soon"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-400 disabled:cursor-not-allowed"
              >
                <HeartIcon />
              </button>
              <button
                type="button"
                disabled
                title="Sharing — coming soon"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 disabled:cursor-not-allowed"
              >
                <ShareIcon />
              </button>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-1 items-start gap-6 md:grid-cols-[3fr_2fr]">
            <VehicleGallery photos={vehicle.photos} title={vehicle.title} />

            <div className="flex flex-col gap-4 lg:sticky lg:top-20">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-5">
                  <p className="mb-1 text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">Asking Price</p>
                  <p className="text-3xl leading-none font-bold tracking-tight text-neutral-900">{currencyFormatter.format(vehicle.price)}</p>
                </div>

                <div className="mb-4 flex flex-col gap-2.5">
                  <DisabledCta label="Send Message" title="Inquiries — coming soon" tone="brand" icon={<MessageIcon />} />
                  <DisabledCta label="WhatsApp" title="WhatsApp inquiry — coming soon" tone="whatsapp" icon={<WhatsAppIcon />} />
                  <DisabledCta label="Schedule Test Drive" title="Appointment booking — coming soon" tone="neutral" icon={<CalendarIcon />} />
                </div>

                {(vehicle.installmentEnabled || vehicle.bankFinanceEnabled) && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {vehicle.installmentEnabled && (
                      <span className="flex items-center justify-center gap-1.5 rounded-md border border-[#99e6df] bg-[#f0fdf9] py-2 text-xs font-semibold text-brand">
                        <InstallmentIcon />
                        HP Installments
                      </span>
                    )}
                    {vehicle.bankFinanceEnabled && (
                      <span className="flex items-center justify-center gap-1.5 rounded-md border border-[#99e6df] bg-[#f0fdf9] py-2 text-xs font-semibold text-brand">
                        <BankIcon />
                        Bank Finance
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
            <SpecHighlight label="Mileage" value={vehicle.mileage != null ? `${mileageFormatter.format(vehicle.mileage)} km` : "—"} icon={<ClockIcon />} />
            <SpecHighlight label="Engine" value={vehicle.engine ?? "—"} icon={<EngineIcon />} />
            <SpecHighlight label="Transmission" value={vehicle.transmission ?? "—"} icon={<TransmissionIcon />} />
            <SpecHighlight label="Fuel Type" value={capitalize(vehicle.fuelType)} icon={<FuelIcon />} />
          </div>

          <section className="mb-10">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-neutral-900">Specifications</h2>
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="border-b border-neutral-200 bg-[#f8f9fa] px-5 py-3">
                <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">General</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <SpecRow label="Body Type" value={vehicle.bodyType ?? "—"} borderRight />
                <SpecRow label="Colour" value={vehicle.color ?? "—"} />
                <SpecRow label="Interior" value={vehicle.interior ?? "—"} borderRight />
                <SpecRow label="Seats" value={vehicle.seats != null ? String(vehicle.seats) : "—"} />
                <SpecRow label="Doors" value={vehicle.doors != null ? String(vehicle.doors) : "—"} borderRight last />
                <SpecRow label="Country of Origin" value={vehicle.countryOfOrigin ?? "—"} last />
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-neutral-900">Description</h2>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="text-sm leading-relaxed whitespace-pre-line text-neutral-600">{vehicle.description || "No description provided."}</p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-neutral-900">Financing Calculator</h2>
            {hasRealFinancing ? (
              <FinancingCalculator
                price={vehicle.price}
                downPaymentType={vehicle.financingDownPaymentType}
                downPaymentPercent={vehicle.financingDownPaymentPercent}
                downPaymentAmount={vehicle.financingDownPaymentAmount}
                interestRatePercentPerYear={vehicle.financingInterestRate!}
                insurancePercent={vehicle.financingInsurancePercent}
                trackerOptions={vehicle.financingTrackerOptions ?? []}
                tenureOptionsMonths={vehicle.financingTenureMonths!}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
                <p className="text-sm font-medium text-neutral-500">Financing details not provided for this listing</p>
                <p className="mt-1 text-xs text-neutral-400">Contact the showroom directly to ask about financing options.</p>
              </div>
            )}
          </section>

          <section className="mb-10">
            <div
              className="flex flex-col items-start justify-between gap-6 rounded-xl p-6 sm:flex-row sm:items-center"
              style={{ background: "linear-gradient(135deg, #004d49 0%, #007f77 100%)" }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <BankIcon color="#fff" />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-bold text-white">Need Financing?</h3>
                  <p className="max-w-120 text-sm leading-relaxed text-white/75">Apply in minutes and get a decision within 24 hours.</p>
                </div>
              </div>
              <button
                type="button"
                disabled
                title="Financing applications — coming soon"
                className="shrink-0 rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-brand disabled:cursor-not-allowed"
              >
                Apply for Financing
              </button>
            </div>
          </section>

          {showroom && (
            <section className="mb-10">
              <h2 className="mb-5 text-lg font-bold tracking-tight text-neutral-900">Sold By</h2>
              <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand text-base font-bold text-white">
                    {getInitials(vehicle.showroomName)}
                  </div>
                  <div>
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-neutral-900">{vehicle.showroomName}</p>
                      {showroom.verified && (
                        <span title="Verified showroom" className="text-brand">
                          <VerifiedIcon />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                      {showroom.city && (
                        <span className="flex items-center gap-1.5">
                          <PinIcon size={12} />
                          {showroom.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon size={12} />
                        Member since {dateFormatter.format(new Date(showroom.created_at))} · {activeListingCount ?? 0} active listing
                        {activeListingCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  title="Showroom profile pages — coming soon"
                  className="shrink-0 rounded-md border border-[#99e6df] bg-[#f0fdf9] px-5 py-2.5 text-sm font-semibold text-brand disabled:cursor-not-allowed"
                >
                  View Dealer Profile →
                </button>
              </div>
            </section>
          )}

          {similarVehicles.length > 0 && (
            <div className="mt-4">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-neutral-900">Similar Cars</h2>
                <Link href={`/listing?make=${encodeURIComponent(vehicle.make)}`} className="text-sm font-medium text-brand no-underline hover:text-brand-dark">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {similarVehicles.map((similar) => (
                  <VehicleCard key={similar.id} vehicle={similar} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function capitalize(value: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function SpecHighlight({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white px-3 py-4">
      <div className="mb-1.5 text-brand">{icon}</div>
      <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">{label}</p>
      <p className="truncate text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function SpecRow({ label, value, borderRight, last }: { label: string; value: string; borderRight?: boolean; last?: boolean }) {
  return (
    <div
      className={`flex items-center bg-white px-5 py-3 ${last ? "" : "border-b border-neutral-100"} ${borderRight ? "md:border-r md:border-neutral-100" : ""}`}
    >
      <span className="w-40 shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function DisabledCta({ label, title, tone, icon }: { label: string; title: string; tone: "brand" | "whatsapp" | "neutral"; icon: React.ReactNode }) {
  const toneClass =
    tone === "brand"
      ? "bg-brand text-white"
      : tone === "whatsapp"
        ? "border border-[#25D366] text-[#25D366] bg-white"
        : "border border-neutral-300 text-neutral-700 bg-white";
  return (
    <button
      type="button"
      disabled
      title={title}
      className={`flex w-full items-center justify-center gap-2 rounded-[7px] py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${toneClass}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PinIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
    </svg>
  );
}

function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function InstallmentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function BankIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function EngineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-6" />
    </svg>
  );
}

function TransmissionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6M9 12h6M9 15h4" />
    </svg>
  );
}

function FuelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
    </svg>
  );
}
