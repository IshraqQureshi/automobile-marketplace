import type { Metadata } from "next";
import { BrowseByBrand } from "@/components/home/browse-by-brand";
import { CertifiedShowroomsStrip } from "@/components/home/certified-showrooms-strip";
import { HeroSearch } from "@/components/home/hero-search";
import { HighlightSection } from "@/components/home/highlight-section";
import { MostSearchedVehicles, type HomeVehicleItem } from "@/components/home/most-searched-vehicles";
import { PopularBrands } from "@/components/home/popular-brands";
import { PopularModels, type PopularModelItem } from "@/components/home/popular-models";
import { getSystemSettingString } from "@/lib/system-settings";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem } from "@/features/vehicle/types";

export const metadata: Metadata = {
  title: "HarakaGari — Kenya's Premium Car Marketplace",
  description:
    "Search verified vehicle listings from certified showrooms across Kenya. Bank finance and HP installments available. Browse by brand, model, and body type.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "HarakaGari — Kenya's Premium Car Marketplace",
    description: "Search verified vehicle listings from certified showrooms across Kenya — bank finance and HP installments available.",
    url: "/",
    siteName: "HarakaGari",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HarakaGari — Kenya's Premium Car Marketplace",
    description: "Search verified vehicle listings from certified showrooms across Kenya.",
  },
};

const MAX_VEHICLES_FOR_AGGREGATION = 300;
const MOST_SEARCHED_LIMIT = 8;
const POPULAR_BRANDS_LIMIT = 10;
const POPULAR_MODELS_LIMIT = 6;
const CERTIFIED_SHOWROOMS_LIMIT = 12;
const HIGHLIGHTS_LIMIT = 4;

export default async function Home() {
  const supabase = await createClient();

  const [
    { count: showroomCount },
    { count: vehicleCount },
    { data: showroomRows },
    { data: brandRows },
    { data: vehicleRows },
    { data: tiktokHighlights },
    { data: youtubeHighlights },
    tiktokProfileUrl,
    youtubeChannelUrl,
  ] = await Promise.all([
    supabase.from("showrooms").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase
      .from("showrooms")
      .select("id, business_name, logo_storage_path")
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(CERTIFIED_SHOWROOMS_LIMIT),
    supabase.from("brands").select("id, name, logo_storage_path").order("name"),
    supabase
      .from("vehicles")
      .select(`${VEHICLE_SELECT_COLUMNS}, showrooms(business_name)`)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(MAX_VEHICLES_FOR_AGGREGATION),
    supabase
      .from("homepage_highlights")
      .select("id, title, video_url, thumbnail_storage_path")
      .eq("platform", "TIKTOK")
      .eq("is_active", true)
      .order("sort_order")
      .limit(HIGHLIGHTS_LIMIT),
    supabase
      .from("homepage_highlights")
      .select("id, title, video_url, thumbnail_storage_path")
      .eq("platform", "YOUTUBE")
      .eq("is_active", true)
      .order("sort_order")
      .limit(HIGHLIGHTS_LIMIT),
    getSystemSettingString(supabase, "homepage_tiktok_profile_url"),
    getSystemSettingString(supabase, "homepage_youtube_channel_url"),
  ]);

  const getBrandLogoUrl = (path: string) => supabase.storage.from("brand-logos").getPublicUrl(path).data.publicUrl;
  const getShowroomLogoUrl = (path: string) => supabase.storage.from("showroom-logos").getPublicUrl(path).data.publicUrl;
  const getHighlightThumbnailUrl = (path: string) => supabase.storage.from("homepage-highlights").getPublicUrl(path).data.publicUrl;

  const certifiedShowrooms = (showroomRows ?? []).map((row) => ({
    id: row.id,
    name: row.business_name,
    logoUrl: row.logo_storage_path ? getShowroomLogoUrl(row.logo_storage_path) : null,
  }));

  const brandTiles = (brandRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    logoUrl: row.logo_storage_path ? getBrandLogoUrl(row.logo_storage_path) : null,
  }));
  const brandLogoByName = new Map(brandTiles.map((b) => [b.name.toLowerCase(), b]));

  const vehicles: HomeVehicleItem[] = (vehicleRows ?? []).map((row) => ({
    ...vehicleRowToListItem(row, (storagePath) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl),
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  }));

  // "Most Searched"/"Popular Brands"/"Popular Models" are the design's own
  // labels (design/homepage.png) — no search-analytics tracking exists yet
  // to back "most searched" literally, so all three are backed by real,
  // dynamically-computed aggregates over currently-active listings instead
  // (recency for "Most Searched"; listing counts for the other two). See
  // .claude/docs/MVP_PROGRESS.md's decisions log.
  const mostSearchedVehicles = vehicles.slice(0, MOST_SEARCHED_LIMIT);

  const brandCounts = new Map<string, number>();
  const modelGroups = new Map<string, { make: string; model: string; count: number; photoUrl: string | null }>();
  for (const vehicle of vehicles) {
    brandCounts.set(vehicle.make, (brandCounts.get(vehicle.make) ?? 0) + 1);

    const modelKey = `${vehicle.make}::${vehicle.model}`;
    const existing = modelGroups.get(modelKey);
    const primaryPhoto = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
    if (existing) {
      existing.count += 1;
    } else {
      modelGroups.set(modelKey, { make: vehicle.make, model: vehicle.model, count: 1, photoUrl: primaryPhoto?.url ?? null });
    }
  }

  const popularBrands = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, POPULAR_BRANDS_LIMIT)
    .map(([make, count]) => {
      const matchedBrand = brandLogoByName.get(make.toLowerCase());
      return { id: matchedBrand?.id ?? make, name: make, logoUrl: matchedBrand?.logoUrl ?? null, listingCount: count };
    });

  const popularModels: PopularModelItem[] = [...modelGroups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, POPULAR_MODELS_LIMIT)
    .map((group) => ({ key: `${group.make}::${group.model}`, make: group.make, model: group.model, listingCount: group.count, photoUrl: group.photoUrl }));

  const tiktokItems = (tiktokHighlights ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    videoUrl: row.video_url,
    thumbnailUrl: getHighlightThumbnailUrl(row.thumbnail_storage_path),
  }));
  const youtubeItems = (youtubeHighlights ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    videoUrl: row.video_url,
    thumbnailUrl: getHighlightThumbnailUrl(row.thumbnail_storage_path),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "HarakaGari",
    url: publicEnv.NEXT_PUBLIC_SITE_URL,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <HeroSearch showroomCount={showroomCount ?? 0} vehicleCount={vehicleCount ?? 0} />
      <CertifiedShowroomsStrip showrooms={certifiedShowrooms} />
      <BrowseByBrand brands={brandTiles} />

      <HighlightSection
        eyebrow="On TikTok"
        heading="Watch & Discover"
        subtitle="Real car content from Kenya's top showrooms"
        handleLabel="@HarakaGari"
        profileUrl={tiktokProfileUrl}
        items={tiktokItems}
        platformBadgeClassName="bg-[#FE2C55] text-white"
        platformIcon={<TikTokIcon />}
      />

      <MostSearchedVehicles vehicles={mostSearchedVehicles} />

      <HighlightSection
        eyebrow="On YouTube"
        heading="Reviews & Guides"
        subtitle="In-depth car reviews, comparisons and buying guides"
        handleLabel="@HarakaGari"
        profileUrl={youtubeChannelUrl}
        items={youtubeItems}
        platformBadgeClassName="bg-red-600 text-white"
        platformIcon={<YouTubeIcon />}
      />

      <PopularBrands brands={popularBrands} />
      <PopularModels models={popularModels} />
    </>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-3.14-1.4V14.9a4.9 4.9 0 1 1-4.9-4.9c.16 0 .32.01.48.03v2.5a2.4 2.4 0 1 0 1.92 2.35V2h2.44a4.28 4.28 0 0 0 4.2 4.2v-.38Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4h0s-3.9 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.6c0 1.8.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.9.8 2.3.9 1.7.2 7.1.2 7.1.2S9.9 19 12.7 18.8c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5v-1.6c0-1.8-.2-3.5-.2-3.5ZM9.9 14.6V8.9l5.4 2.9-5.4 2.8Z" />
    </svg>
  );
}
