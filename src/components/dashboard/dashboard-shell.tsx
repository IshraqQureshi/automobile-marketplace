"use client";

import Image from "next/image";
import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { OwnerShowroom } from "@/features/showroom/my-showroom";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  email: string;
  showroom: OwnerShowroom;
  children: React.ReactNode;
}

/**
 * Wraps the sidebar + page content in a shell that's actually usable below
 * the `lg` breakpoint — the previous fixed `grid-cols-[248px_1fr]` (still
 * used as-is by the admin panel, an internal desktop-only tool) left no room
 * for page content on a phone-width viewport, confirmed via a live
 * Playwright screenshot at 390px showing the recent-listings row's own
 * title/subtitle clipped out of existence. Showroom owners are a
 * more mobile-likely audience than internal admins, so this dashboard gets
 * an off-canvas drawer instead of carrying the same gap forward.
 */
export function DashboardShell({ email, showroom, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[248px_1fr]">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={110} height={29} priority />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          <MenuIcon />
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[248px] transform bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <DashboardSidebar email={email} showroom={showroom} onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
