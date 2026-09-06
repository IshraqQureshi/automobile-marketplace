"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { OwnerShowroom } from "@/features/showroom/my-showroom";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  email: string;
  showroom: OwnerShowroom;
  unreadInquiryCount?: number;
  children: React.ReactNode;
}

// Matches this file's own `lg:` classes below — Tailwind v4's default `lg`
// breakpoint (1024px), not overridden anywhere in this project (checked
// globals.css's @theme block and confirmed no tailwind.config breakpoint
// override exists).
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeToDesktopQuery(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getIsDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getIsDesktopServerSnapshot() {
  return false;
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
 *
 * `inert` (not just CSS translation) keeps the drawer's nav out of the tab
 * order and accessibility tree while closed on mobile, and keeps the dimmed
 * main content out of both while the drawer is open — otherwise a keyboard/
 * screen-reader user would tab through an invisible off-screen nav, or into
 * backgrounded page content behind the backdrop, neither of which a sighted
 * mouse user would ever notice.
 *
 * `inert` is a plain DOM attribute with no media-query awareness of its
 * own — driving it directly off the drawer's `open` boolean alone made the
 * sidebar permanently inert (unclickable, confirmed live via a real
 * Playwright click timing out on "element intercepts pointer events") on
 * desktop, where `open` starts and stays false since there's no mobile
 * drawer to open there. `isDesktop` (tracked via matchMedia, not rendering
 * two separate sidebar instances — which would reintroduce duplicate-text
 * ambiguity into every existing test that reads sidebar content) gates
 * `inert` to mobile only. Escape closes the drawer and returns focus to the
 * button that opened it, matching standard dialog/drawer behavior.
 */
export function DashboardShell({ email, showroom, unreadInquiryCount, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useSyncExternalStore(subscribeToDesktopQuery, getIsDesktopSnapshot, getIsDesktopServerSnapshot);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[248px_1fr]">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <Image src="/logo.png" alt="HarakaGari — Powered by Arresa" width={110} height={29} priority />
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          {open ? <XMarkIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <button type="button" aria-label="Close menu" onClick={close} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />
      )}

      <div
        inert={!isDesktop && !open ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[248px] transform bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <DashboardSidebar email={email} showroom={showroom} unreadInquiryCount={unreadInquiryCount} onNavigate={close} />
      </div>

      <div inert={!isDesktop && open ? true : undefined} className="flex min-w-0 flex-col">
        {children}
      </div>
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

function XMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
