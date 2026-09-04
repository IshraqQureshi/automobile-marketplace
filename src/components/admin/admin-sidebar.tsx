"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSignOutAction } from "@/features/admin/actions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [{ label: "Dashboard", href: "/admin", icon: DashboardIcon }] as const;

// Showroom/vehicle/user management are Day 2/4 scope — no pages exist yet.
// Same "coming soon" treatment as the public header's Brands/Model/Type nav
// (src/components/layout/header.tsx) rather than linking somewhere that 404s.
const UPCOMING_NAV_ITEMS = [
  { label: "Showrooms", icon: ShowroomIcon },
  { label: "Vehicles", icon: VehicleIcon },
  { label: "Users", icon: UsersIcon },
] as const;

interface AdminSidebarProps {
  email: string;
}

export function AdminSidebar({ email }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-7 border-r border-neutral-200 bg-white px-4 py-5">
      <Link href="/admin" className="px-2">
        <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={130} height={34} priority />
      </Link>

      <nav className="flex flex-col gap-0.5">
        <span className="px-3 pb-1.5 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
          Overview
        </span>
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-brand text-white" : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav className="flex flex-col gap-0.5">
        <span className="px-3 pb-1.5 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
          Marketplace
        </span>
        {UPCOMING_NAV_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled
            title="Coming soon"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 disabled:cursor-default disabled:opacity-60"
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-neutral-200 pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {email.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-neutral-900">{email}</p>
          <p className="text-[11px] text-neutral-400">Administrator</p>
        </div>
        <form action={adminSignOutAction}>
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function ShowroomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 9v11h14V9" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M3 13l1.6-5.2A2 2 0 0 1 6.5 6.5h11a2 2 0 0 1 1.9 1.3L21 13" />
      <rect x="3" y="13" width="18" height="6" rx="1.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
