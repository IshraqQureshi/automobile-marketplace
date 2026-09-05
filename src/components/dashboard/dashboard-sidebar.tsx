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
}

interface DashboardSidebarProps {
  email: string;
  showroom: OwnerShowroom;
  // Fired on any real nav Link click — DashboardShell uses this to close the
  // mobile off-canvas drawer after navigating, so it isn't left open over
  // the new page. Optional/unused on desktop, where the sidebar is static.
  onNavigate?: () => void;
}

export function DashboardSidebar({ email, showroom, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const approved = showroom.status === "APPROVED";

  // Appointments is a real Day 4 requirement with no page built yet — same
  // "coming soon" treatment as the admin sidebar's own not-yet-built
  // entries, rather than linking somewhere that 404s. Profile editing is
  // allowed regardless of approval status (unlike Vehicles), so it's never
  // gated behind `approved` here.
  const items: NavEntry[] = [
    { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
    { label: "Vehicles", href: approved ? "/dashboard/vehicles" : null, icon: () => <CarIcon /> },
    { label: "Profile", href: "/dashboard/profile", icon: ProfileIcon },
    { label: "Appointments", href: null, icon: CalendarIcon },
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
              {item.label}
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
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
