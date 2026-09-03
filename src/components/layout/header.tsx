"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Nav dropdowns (Brands/Model/Type) and search are visually present per the
 * design but not yet wired to real data — no vehicle taxonomy or search
 * exists until MKT-001/MKT-002/MKT-003. They render as inert (no dropdown
 * content, search has no destination) rather than being omitted, since the
 * user asked for header fidelity to the design; functionality lands with
 * those features.
 */
const NAV_ITEMS = ["Brands", "Model", "Type"] as const;

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={146} height={38} priority />
        </Link>

        <nav aria-label="Vehicle categories" className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center gap-1 text-sm font-medium text-neutral-700 disabled:cursor-default disabled:opacity-60"
            >
              {item}
              <ChevronDownIcon />
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <button type="button" disabled title="Search coming soon" aria-label="Search" className="text-neutral-500 disabled:opacity-60">
            <SearchIcon />
          </button>
          <Link href="/login" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Sign up
          </Link>
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
          {NAV_ITEMS.map((item) => (
            <span key={item} className="px-2 py-2 text-sm font-medium text-neutral-400">
              {item} <span className="text-xs">(coming soon)</span>
            </span>
          ))}
          <Link href="/login" className="rounded-md px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Log in
          </Link>
          <Link href="/login" className="rounded-md bg-brand px-2 py-2 text-center text-sm font-medium text-white">
            Sign up
          </Link>
        </div>
      </div>
    </header>
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
