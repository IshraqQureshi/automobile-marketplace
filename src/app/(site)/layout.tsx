import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { resolveLoggedInHomePath } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

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

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const headerUser = await getHeaderUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={headerUser} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
