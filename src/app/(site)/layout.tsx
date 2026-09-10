import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { resolveLoggedInHomePath } from "@/features/auth/actions";
import type { NavCatalog } from "@/features/vehicle/nav-catalog-links";
import { createClient } from "@/lib/supabase/server";
import { getSystemSettingString } from "@/lib/system-settings";

interface SiteLayoutProps {
  children: React.ReactNode;
}

const PROFILE_LABELS: Record<string, string> = {
  "/admin": "Admin panel",
  "/dashboard": "Showroom dashboard",
  "/account": "My account",
};

/**
 * Feeds the header its logged-in state so it can swap Login/Signup for a
 * Profile link — computed here (not in Header itself) since Header is a
 * client component and this needs a server-side session lookup. The
 * destination itself comes from resolveLoggedInHomePath (single source of
 * truth for "where does this user belong", also used by the /login and
 * /forgot-password already-authenticated guards and signInAction) — this
 * only adds the human-readable label the header UI needs on top of it,
 * rather than re-deriving the ADMIN/showroom-owner/else branching a second
 * time, which could otherwise silently drift out of sync with it.
 */
async function getHeaderUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profileHref = await resolveLoggedInHomePath(user.id);
  return { email: user.email ?? "", profileHref, profileLabel: PROFILE_LABELS[profileHref] ?? "My account" };
}

/**
 * The header's Brands/Model/Type nav dropdowns — reference data (~10 rows
 * each in practice), read straight from the admin-managed catalog tables
 * (brands/models/vehicle_types), the same tables the homepage's "Browse by
 * Brand" section and the dashboard's "Add vehicle" form dropdowns already
 * read from. Their RLS `..._select_all` policies were written with exactly
 * this in mind (see supabase/migrations/20260905010001_create_catalog_rls_policies.sql's
 * own comment: "the public header nav ... need them"). vehicles.make/model
 * are plain text, not FK'd to these tables, so links target /listing by
 * name (encodeURIComponent'd), matching BrowseByBrand's existing convention
 * — not by id.
 */
async function getNavCatalog(): Promise<NavCatalog> {
  const supabase = await createClient();
  const [brandsResult, modelsResult, typesResult] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("models").select("id, name, brands(name)").order("name"),
    supabase.from("vehicle_types").select("id, name").order("name"),
  ]);

  return {
    brands: (brandsResult.data ?? []).map((b) => ({ id: b.id, name: b.name })),
    models: (modelsResult.data ?? []).map((m) => ({ id: m.id, name: m.name, brandName: m.brands?.name ?? null })),
    types: (typesResult.data ?? []).map((t) => ({ id: t.id, name: t.name })),
  };
}

/**
 * The footer's "Follow us" links — admin-editable (see
 * /admin/highlights's "Social links" card, same system_settings rows the
 * homepage's own TikTok/YouTube "Watch & Discover"/"Reviews & Guides"
 * sections already read). "" means not configured yet, which the footer
 * treats as "don't show this icon" rather than a dead link.
 */
async function getFooterSocialLinks() {
  const supabase = await createClient();
  const [facebookUrl, instagramUrl, xUrl, youtubeUrl, tiktokUrl] = await Promise.all([
    getSystemSettingString(supabase, "homepage_facebook_url"),
    getSystemSettingString(supabase, "homepage_instagram_url"),
    getSystemSettingString(supabase, "homepage_x_url"),
    getSystemSettingString(supabase, "homepage_youtube_channel_url"),
    getSystemSettingString(supabase, "homepage_tiktok_profile_url"),
  ]);
  return { facebookUrl, instagramUrl, xUrl, youtubeUrl, tiktokUrl };
}

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const [headerUser, navCatalog, socialLinks] = await Promise.all([getHeaderUser(), getNavCatalog(), getFooterSocialLinks()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={headerUser} navCatalog={navCatalog} />
      <div className="flex-1">{children}</div>
      <Footer navCatalog={navCatalog} socialLinks={socialLinks} />
    </div>
  );
}
