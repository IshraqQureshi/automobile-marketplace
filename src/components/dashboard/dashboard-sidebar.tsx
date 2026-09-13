"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarIcon, ProfileIcon } from "@/components/admin/admin-ui";
import { signOutAction } from "@/features/auth/actions";
import type { OwnerShowroom } from "@/features/showroom/my-showroom";
import { cn } from "@/lib/utils";

interface NavEntry {
  label: string;
  href: string | null; // null = not built yet, renders inert ("Coming soon")
  icon: () => React.JSX.Element;
  count?: number;
}

interface DashboardSidebarProps {
  email: string;
  showroom: OwnerShowroom;
  pendingAppointmentCount?: number;
  // 1 when this showroom's current subscription is expiring soon or
  // overdue, 0 otherwise — a due/not-due flag reusing the same NavEntry
  // `count` badge convention as Appointments above, not a literal count of
  // multiple due payments (a showroom only ever has one *current* period).
  paymentDueCount?: number;
  // Fired on any real nav Link click — DashboardShell uses this to close the
  // mobile off-canvas drawer after navigating, so it isn't left open over
  // the new page. Optional/unused on desktop, where the sidebar is static.
  onNavigate?: () => void;
}

export function DashboardSidebar({ email, showroom, pendingAppointmentCount = 0, paymentDueCount = 0, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const approved = showroom.status === "APPROVED";

  // Profile editing is allowed regardless of approval status (unlike
  // Vehicles), so it's never gated behind `approved` here. Appointments
  // follows the same approval gate as Vehicles — a real test drive can't
  // exist for an unapproved showroom anyway. Inquiries and Financing are
  // deliberately NOT linked here per direct request — those now go to
  // admin only (/admin/inquiries, /admin/financing); the showroom-scoped
  // /dashboard/inquiries and /dashboard/financing pages themselves are
  // untouched (still real, RLS-scoped to the caller's own data — this is a
  // nav-visibility change, not an access change).
  const items: NavEntry[] = [
    { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
    { label: "Vehicles", href: approved ? "/dashboard/vehicles" : null, icon: () => <CarIcon /> },
    { label: "Appointments", href: approved ? "/dashboard/appointments" : null, icon: CalendarIcon, count: pendingAppointmentCount },
    { label: "Availability", href: approved ? "/dashboard/appointments/availability" : null, icon: AvailabilityIcon },
    { label: "Payments", href: approved ? "/dashboard/payments" : null, icon: PaymentsIcon, count: paymentDueCount },
    { label: "Reports", href: approved ? "/dashboard/reports" : null, icon: ReportsIcon },
    { label: "Profile", href: "/dashboard/profile", icon: ProfileIcon },
    { label: "My Account", href: "/dashboard/account", icon: AccountIcon },
  ];

  return (
    <aside className="flex h-full flex-col gap-7 overflow-y-auto border-r border-neutral-200 bg-white px-4 py-5">
      <Link href="/" className="px-2 opacity-90 transition-opacity hover:opacity-100">
        <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={130} height={34} priority />
      </Link>

      <nav className="flex flex-col gap-0.5">
        <span className="truncate px-3 pb-1.5 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">{showroom.business_name}</span>
        {items.map((item) => {
          if (item.href === null) {
            return (
              <button
                key={item.label}
                type="button"
                disabled
                title={item.label === "Vehicles" ? "Available once your showroom is approved" : "Coming soon"}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 disabled:cursor-default disabled:opacity-60"
              >
                <item.icon />
                {item.label}
              </button>
            );
          }

          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                active ? "bg-brand text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              <item.icon />
              <span className="flex-1">{item.label}</span>
              {!!item.count && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active ? "bg-white/25 text-white" : "bg-brand text-white",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-neutral-200 pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {email.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-neutral-900">{email}</p>
          <p className="text-[11px] text-neutral-400">Showroom owner</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <SignOutIcon />
          </button>
        </form>
      </div>
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

// Distinct from ProfileIcon (used above for the showroom's own business
// "Profile") — a settings-gear reads more clearly as "your personal account
// settings" than reusing the same person-silhouette icon for both nav
// entries would.
function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

function AvailabilityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
