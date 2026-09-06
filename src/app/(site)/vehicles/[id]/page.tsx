import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleGallery } from "@/components/vehicle/vehicle-gallery";
import { currencyFormatter, VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const mileageFormatter = new Intl.NumberFormat("en-KE");
const SIMILAR_VEHICLES_LIMIT = 4;

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getVehicle(id: string) {
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
}

export async function generateMetadata({ params }: VehicleDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getVehicle(id);
  if (!result) return { title: "Vehicle not found — HarakaGari" };

  const { vehicle } = result;
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} — HarakaGari`;
  const description = `${currencyFormatter.format(vehicle.price)} — ${vehicle.mileage != null ? `${mileageFormatter.format(vehicle.mileage)} km` : "Mileage n/a"} — listed by ${vehicle.showroomName}.`;
  return {
    title,
    description,
    alternates: { canonical: `/vehicles/${vehicle.id}` },
    openGraph: { title, description, url: `/vehicles/${vehicle.id}`, images: vehicle.photos[0] ? [vehicle.photos[0].url] : undefined },
  };
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id } = await params;
  const result = await getVehicle(id);
  if (!result) notFound();

  const { vehicle, showroom, supabase } = result;

  const [{ count: activeListingCount }, { data: similarRows }] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", vehicle.showroomId).eq("status", "ACTIVE"),
    supabase
      .from("vehicles")
      .select(`${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name)`)
      .eq("status", "ACTIVE")
      .eq("make", vehicle.make)
      .neq("id", vehicle.id)
      .limit(SIMILAR_VEHICLES_LIMIT),
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:text-neutral-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/vehicles" className="hover:text-neutral-700">
          Vehicles
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-neutral-700">
          {vehicle.make} {vehicle.model}
        </span>
      </nav>

      <p className="text-xs font-semibold tracking-wide text-brand uppercase">
        {vehicle.make} · {vehicle.year}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
        {vehicle.year} {vehicle.make} {vehicle.model}
        {vehicle.variant ? ` ${vehicle.variant}` : ""}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        {showroom?.city && <span>{showroom.city}</span>}
        <span>Listed {dateFormatter.format(new Date(vehicle.createdAt))}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <VehicleGallery photos={vehicle.photos} title={vehicle.title} />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SpecHighlight label="Mileage" value={vehicle.mileage != null ? `${mileageFormatter.format(vehicle.mileage)} km` : "—"} />
            <SpecHighlight label="Engine" value={vehicle.engine ?? "—"} />
            <SpecHighlight label="Transmission" value={vehicle.transmission ?? "—"} />
            <SpecHighlight label="Fuel Type" value={capitalize(vehicle.fuelType)} />
          </div>

          <h2 className="mt-8 font-display text-lg font-bold text-neutral-900">Specifications</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <SpecRow label="Body Type" value={vehicle.bodyType ?? "—"} />
              <SpecRow label="Colour" value={vehicle.color ?? "—"} />
              <SpecRow label="Interior" value={vehicle.interior ?? "—"} />
              <SpecRow label="Seats" value={vehicle.seats != null ? String(vehicle.seats) : "—"} />
              <SpecRow label="Doors" value={vehicle.doors != null ? String(vehicle.doors) : "—"} />
              <SpecRow label="Country of Origin" value={vehicle.countryOfOrigin ?? "—"} />
            </div>
          </div>

          <h2 className="mt-8 font-display text-lg font-bold text-neutral-900">Description</h2>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-neutral-600">
            {vehicle.description || "No description provided."}
          </p>

          {showroom && (
            <>
              <h2 className="mt-8 font-display text-lg font-bold text-neutral-900">Sold By</h2>
              <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    {vehicle.showroomName}
                    {showroom.verified && (
                      <span title="Verified showroom" className="text-brand">
                        ✓
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {showroom.city ? `${showroom.city} · ` : ""}Member since {dateFormatter.format(new Date(showroom.created_at))} ·{" "}
                    {activeListingCount ?? 0} active listing{activeListingCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Showroom profile pages — coming soon"
                  className="shrink-0 rounded-md border border-brand px-4 py-2 text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  View Dealer Profile →
                </button>
              </div>
            </>
          )}

          {similarVehicles.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-lg font-bold text-neutral-900">Similar Cars</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {similarVehicles.map((similar) => (
                  <VehicleCard key={similar.id} vehicle={similar} />
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-neutral-200 p-5">
          <p className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Asking Price</p>
          <p className="mt-1 font-display text-2xl font-bold text-neutral-900 tabular-nums">{currencyFormatter.format(vehicle.price)}</p>

          <div className="mt-4 flex flex-col gap-2">
            <DisabledCta label="Send Message" title="Inquiries — coming soon" />
            <DisabledCta label="WhatsApp" title="WhatsApp inquiry — coming soon" />
            <DisabledCta label="Schedule Test Drive" title="Appointment booking — coming soon" />
          </div>

          {(vehicle.installmentEnabled || vehicle.bankFinanceEnabled) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {vehicle.bankFinanceEnabled && (
                <span className="rounded border border-[#99e6df] bg-[#f0fdf9] px-2.5 py-1 text-[11px] font-semibold text-brand">Bank Finance</span>
              )}
              {vehicle.installmentEnabled && (
                <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  HP Installments
                </span>
              )}
            </div>
          )}

          <p className="mt-4 rounded-md bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-500">
            Financing calculator coming soon — check with the showroom directly about the finance options shown above.
          </p>
        </aside>
      </div>
    </div>
  );
}

// fuel_type is stored lowercase (matches the badge-color lookup keys used
// elsewhere, e.g. vehicle-card.tsx's FUEL_TYPE_BADGE_COLORS) — capitalized
// only for this plain-text display, not a data change.
function capitalize(value: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function SpecHighlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-center">
      <p className="text-[9px] font-semibold tracking-wider text-neutral-400 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function DisabledCta({ label, title }: { label: string; title: string }) {
  return (
    <button
      type="button"
      disabled
      title={title}
      className="rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-400 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
