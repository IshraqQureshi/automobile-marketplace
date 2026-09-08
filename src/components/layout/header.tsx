"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOutAction } from "@/features/auth/actions";
import { FUEL_TYPES } from "@/features/vehicle/schemas";
import { cn } from "@/lib/utils";

export interface HeaderUser {
  email: string;
  // Where "Profile" sends this user — /admin for an admin, /dashboard for a
  // showroom owner, /account for everyone else (see getHeaderUser in
  // (site)/layout.tsx). No account page in between for the first two: the
  // link goes straight there.
  profileHref: string;
  profileLabel: string;
}

export interface NavCatalogItem {
  id: string;
  name: string;
}

export interface NavCatalog {
  brands: NavCatalogItem[];
  models: (NavCatalogItem & { brandName: string | null })[];
  types: NavCatalogItem[];
}

interface HeaderProps {
  user?: HeaderUser | null;
  navCatalog?: NavCatalog;
}

const EMPTY_NAV_CATALOG: NavCatalog = { brands: [], models: [], types: [] };

interface DropdownLinkItem {
  id: string;
  label: string;
  href: string;
}

/** Click-outside-to-close state, shared by the Profile menu and each nav dropdown. */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return { open, setOpen, ref };
}

export function Header({ user = null, navCatalog = EMPTY_NAV_CATALOG }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open: profileMenuOpen, setOpen: setProfileMenuOpen, ref: profileMenuRef } = useDropdown();

  // vehicles.make/model/body_type are plain text, not FK'd to the
  // brands/models/vehicle_types catalog tables — filtering /listing by name
  // (encodeURIComponent'd) matches the homepage's existing BrowseByBrand
  // convention, not by id.
  const brandItems = useMemo<DropdownLinkItem[]>(
    () => navCatalog.brands.map((b) => ({ id: b.id, label: b.name, href: `/listing?make=${encodeURIComponent(b.name)}` })),
    [navCatalog.brands],
  );
  const modelItems = useMemo<DropdownLinkItem[]>(
    () =>
      navCatalog.models.map((m) => ({
        id: m.id,
        label: m.brandName ? `${m.brandName} ${m.name}` : m.name,
        href: `/listing?model=${encodeURIComponent(m.name)}`,
      })),
    [navCatalog.models],
  );
  // The vehicle_types catalog table (admin-managed, shared with the "add
  // vehicle" form) mixes two different concepts under one flat list: real
  // body shapes (Sedan, SUV, Hatchback, ...) alongside three FUEL_TYPES
  // enum values (Diesel/Hybrid/Electric) — there's no schema-level
  // distinction between them. /listing filters those on two different
  // columns (bodyType -> vehicles.body_type, fuelType -> vehicles.fuel_type),
  // so a catalog entry whose name is one of FUEL_TYPES routes to fuelType;
  // everything else routes to bodyType, matching what it actually filters.
  const typeItems = useMemo<DropdownLinkItem[]>(
    () =>
      navCatalog.types.map((t) => {
        const param = (FUEL_TYPES as readonly string[]).includes(t.name) ? "fuelType" : "bodyType";
        return { id: t.id, label: t.name, href: `/listing?${param}=${encodeURIComponent(t.name)}` };
      }),
    [navCatalog.types],
  );

  return (
    <header className="relative z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={146} height={38} priority />
        </Link>

        <nav aria-label="Vehicle categories" className="hidden items-center gap-6 md:flex">
          <NavDropdown label="Brands" items={brandItems} />
          <NavDropdown label="Model" items={modelItems} />
          <NavDropdown label="Type" items={typeItems} />
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/listing" aria-label="Search vehicles" className="text-neutral-500 hover:text-neutral-700">
            <SearchIcon />
          </Link>
          <Link href="/showrooms" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Showrooms
          </Link>
          <Link href="/ready-to-sell" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Sell your car
          </Link>
          {user ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {user.email.slice(0, 2).toUpperCase()}
                </span>
                Profile
                <ChevronDownIcon />
              </button>
              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
                >
                  <p className="truncate border-b border-neutral-100 px-3 py-2 text-xs text-neutral-400">{user.email}</p>
                  <Link
                    href={user.profileHref}
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    {user.profileLabel}
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
                Log in
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
          className="text-neutral-700 md:hidden"
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div className={cn("border-t border-neutral-200 md:hidden", mobileMenuOpen ? "block" : "hidden")}>
        <div className="flex flex-col gap-1 px-4 py-3">
          <MobileNavGroup label="Brands" items={brandItems} onNavigate={() => setMobileMenuOpen(false)} />
          <MobileNavGroup label="Model" items={modelItems} onNavigate={() => setMobileMenuOpen(false)} />
          <MobileNavGroup label="Type" items={typeItems} onNavigate={() => setMobileMenuOpen(false)} />
          <Link href="/showrooms" className="rounded-md px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Showrooms
          </Link>
          <Link href="/ready-to-sell" className="rounded-md px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Sell your car
          </Link>
          {user ? (
            <>
              <Link
                href={user.profileHref}
                className="rounded-md px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {user.profileLabel}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Log in
              </Link>
              <Link href="/login" className="rounded-md bg-brand px-2 py-2 text-center text-sm font-medium text-white">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Desktop nav item — a real dropdown once catalog data exists, otherwise the original disabled "Coming soon" placeholder (e.g. a fresh install with no catalog rows yet). */
function NavDropdown({ label, items }: { label: string; items: DropdownLinkItem[] }) {
  const { open, setOpen, ref } = useDropdown();

  if (items.length === 0) {
    return (
      <button
        type="button"
        disabled
        title="Coming soon"
        className="flex items-center gap-1 text-sm font-medium text-neutral-700 disabled:cursor-default disabled:opacity-60"
      >
        {label}
        <ChevronDownIcon />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
      >
        {label}
        <ChevronDownIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-10 mt-2 max-h-80 w-56 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Mobile menu's equivalent of NavDropdown — a native <details> disclosure needs no open-state wiring of its own. Renders nothing when there's no catalog data yet, same "Coming soon" fallback as NavDropdown. */
function MobileNavGroup({ label, items, onNavigate }: { label: string; items: DropdownLinkItem[]; onNavigate: () => void }) {
  if (items.length === 0) {
    return (
      <span className="px-2 py-2 text-sm font-medium text-neutral-400">
        {label} <span className="text-xs">(coming soon)</span>
      </span>
    );
  }

  return (
    <details className="group rounded-md px-2 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-neutral-700">
        {label}
        <ChevronDownIcon />
      </summary>
      <div className="mt-1 flex flex-col gap-0.5 pl-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className="rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
