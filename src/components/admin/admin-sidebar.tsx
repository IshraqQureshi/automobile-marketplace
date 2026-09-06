"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileIcon, ShowroomIcon, TagIcon } from "@/components/admin/admin-ui";
import { adminSignOutAction } from "@/features/admin/actions";
import { cn } from "@/lib/utils";

interface NavEntry {
  label: string;
  href: string | null; // null = not built yet, renders inert ("Coming soon")
  icon: () => React.JSX.Element;
  count?: number;
}

const OVERVIEW_ITEMS: NavEntry[] = [{ label: "Dashboard", href: "/admin", icon: DashboardIcon }];

const MARKETPLACE_ITEMS: NavEntry[] = [
  { label: "Catalog", href: "/admin/catalog", icon: () => <TagIcon className="h-4.25 w-4.25" /> },
  { label: "Showrooms", href: "/admin/showrooms", icon: ShowroomIcon },
  { label: "Vehicles", href: "/admin/vehicles", icon: VehicleIcon },
];

const CONTENT_ITEMS: NavEntry[] = [{ label: "Homepage Highlights", href: "/admin/highlights", icon: VideoIcon }];

const ADMIN_ITEMS: NavEntry[] = [
  { label: "My Profile", href: "/admin/profile", icon: ProfileIcon },
  { label: "Users", href: "/admin/users", icon: UsersIcon },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
];

interface AdminSidebarProps {
  email: string;
  unreadInquiryCount?: number;
  unreadFinancingCount?: number;
  dueSubscriptionsCount?: number;
}

export function AdminSidebar({ email, unreadInquiryCount = 0, unreadFinancingCount = 0, dueSubscriptionsCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const marketplaceItems: NavEntry[] = [
    ...MARKETPLACE_ITEMS,
    { label: "Inquiries", href: "/admin/inquiries", icon: InquiryIcon, count: unreadInquiryCount },
    { label: "Financing", href: "/admin/financing", icon: FinancingIcon, count: unreadFinancingCount },
  ];
  const billingItems: NavEntry[] = [{ label: "Payments", href: "/admin/payments", icon: PaymentIcon, count: dueSubscriptionsCount }];

  return (
    <aside className="flex flex-col gap-7 border-r border-neutral-200 bg-white px-4 py-5">
      <Link href="/admin" className="px-2">
        <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={130} height={34} priority />
      </Link>

      <NavGroup label="Overview" items={OVERVIEW_ITEMS} pathname={pathname} />
      <NavGroup label="Marketplace" items={marketplaceItems} pathname={pathname} />
      <NavGroup label="Content" items={CONTENT_ITEMS} pathname={pathname} />
      <NavGroup label="Billing" items={billingItems} pathname={pathname} />
      <NavGroup label="Admin" items={ADMIN_ITEMS} pathname={pathname} />

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

interface NavGroupProps {
  label: string;
  items: NavEntry[];
  pathname: string;
}

function NavGroup({ label, items, pathname }: NavGroupProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      <span className="px-3 pb-1.5 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">{label}</span>
      {items.map((item) => {
        if (item.href === null) {
          return (
            <button
              key={item.label}
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 disabled:cursor-default disabled:opacity-60"
            >
              <item.icon />
              {item.label}
            </button>
          );
        }

        // Exact match is correct today (every real NavEntry is a top-level
        // page — /admin/showrooms included, since its review UI is a modal
        // on that one page, not a nested route). Once a section gets a real
        // nested detail route (e.g. Day 4 vehicle management), this needs
        // pathname.startsWith(item.href) instead, or a detail sub-page
        // won't highlight its parent nav item.
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-brand text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            <item.icon />
            <span className="flex-1">{item.label}</span>
            {!!item.count && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-white/25 text-white" : "bg-brand text-white")}>
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
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

function InquiryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FinancingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="m17 10 4-3v10l-4-3" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <path d="M3 13l1.6-5.2A2 2 0 0 1 6.5 6.5h11a2 2 0 0 1 1.9 1.3L21 13" />
      <rect x="3" y="13" width="18" height="6" rx="1.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
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
