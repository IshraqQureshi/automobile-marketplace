import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { currentUserRole } from "@/features/auth/actions";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

interface SiteLayoutProps {
  children: React.ReactNode;
}

/**
 * Feeds the header its logged-in state so it can swap Login/Signup for a
 * Profile link — computed here (not in Header itself) since Header is a
 * client component and this needs a server-side session/role lookup.
 * Destination mirrors resolveLoggedInHomePath (ADMIN → /admin, a showroom
 * owner → /dashboard, everyone else → /account) but also needs a
 * human-readable label and initials for the header UI itself, so it isn't
 * reused verbatim — it wraps the same currentUserRole/getOwnerShowroom
 * calls that helper is built from.
 */
async function getHeaderUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = await currentUserRole(supabase);
  if (role === "ADMIN") {
    return { email: user.email ?? "", profileHref: "/admin", profileLabel: "Admin panel" };
  }

  const showroom = await getOwnerShowroom(user.id);
  return showroom
    ? { email: user.email ?? "", profileHref: "/dashboard", profileLabel: "Showroom dashboard" }
    : { email: user.email ?? "", profileHref: "/account", profileLabel: "My account" };
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
