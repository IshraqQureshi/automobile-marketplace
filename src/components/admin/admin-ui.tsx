import type { ReactNode } from "react";

/**
 * Shared visual building blocks for admin CRUD/review screens — originally
 * built for the three catalog cards (CatalogList, CatalogModelsList,
 * CatalogBrandsList) but generic from the start, so also used by the
 * showroom approval list — kept here so each screen doesn't reinvent
 * row-action buttons, header layout, and table chrome with slightly
 * different markup.
 */

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  // Omitted entirely for screens with no "create" action — every other
  // admin CRUD screen (catalog, showrooms) always passes both.
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Header for a full-width admin panel — icon + title/description on the
 * left, an optional primary "+ New X" action on the right.
 */
export function SectionHeader({ icon, title, description, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</span>
        <div>
          <h2 className="font-display text-lg font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <PlusIcon />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
      {children}
    </label>
  );
}

export function DialogFormActions({ pending, submitLabel, onCancel }: { pending: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">{children}</div>;
}

export function TableEmptyState({ message }: { message: string }) {
  return <p className="px-5 py-10 text-center text-sm text-neutral-400">{message}</p>;
}

// Shared search-box-plus-filter-dropdown row, used above every list table
// (admin showrooms/catalog tabs, the showroom-owner's vehicle list) so each
// list only needs to supply its own filter <select>(s) as children, not
// rebuild the search input's icon/spacing/focus styling each time.
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-48 flex-1">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-300 py-2.5 pr-3 pl-9 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

// Shared native-<select> styling for a filter dropdown next to SearchInput —
// each call site supplies its own width via an appended class, same
// "don't bake a width into a shared constant" reasoning as vehicle-form.tsx's
// own selectClassName (a shared w-full silently loses to a caller's
// appended w-32 in Tailwind's generated stylesheet, regardless of class-list
// order — see that file's own comment for the live-confirmed root cause).
export const filterSelectClassName =
  "shrink-0 rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-neutral-100 text-neutral-500",
  NEW: "bg-blue-50 text-blue-700",
  VIEWED: "bg-neutral-100 text-neutral-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE_CLASSES[status] ?? "bg-neutral-100 text-neutral-500"}`}>
      {status.toLowerCase()}
    </span>
  );
}

export function InitialAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-400">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function MetaBadge({ children }: { children: ReactNode }) {
  return <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">{children}</span>;
}

interface RowIconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "neutral" | "danger" | "brand";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<RowIconButtonProps["variant"]>, string> = {
  neutral: "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
  danger: "text-neutral-400 hover:bg-red-50 hover:text-red-600",
  brand: "text-brand hover:bg-brand/10",
};

export function RowIconButton({ label, onClick, disabled, variant = "neutral", children }: RowIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </button>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-.87 13.14A2 2 0 0 1 16.14 21H7.86a2 2 0 0 1-1.99-1.86L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 16V4M12 4 7 9M12 4l5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

// Also used as the admin sidebar's "Catalog" nav icon (imported from here
// rather than duplicated) — className lets each caller size it for its own
// context (nav row vs. this file's card-header badge).
export function TagIcon({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M20.6 12.9 12.9 20.6a2 2 0 0 1-2.8 0l-7.7-7.7a2 2 0 0 1 0-2.8L10.1 2.4a2 2 0 0 1 1.4-.6h5.5a2 2 0 0 1 2 2v5.5a2 2 0 0 1-.4 1.6Z" />
      <circle cx="15.5" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Also used as the admin sidebar's "Showrooms" nav icon — same reasoning as
// TagIcon above.
export function ShowroomIcon({ className = "h-4.25 w-4.25" }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 9v11h14V9" />
    </svg>
  );
}

export function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 17V11l2-5h14l2 5v6" />
      <path d="M3 11h18" />
    </svg>
  );
}

// Also used as the dashboard sidebar's "Profile" nav icon and the dashboard
// home page's "Edit showroom profile" quick-action icon (both under
// src/components/dashboard/, src/app/dashboard/page.tsx) — kept here rather
// than in dashboard-sidebar.tsx (a "use client" file) so a Server Component
// importing it doesn't need to pull in a client-component reference for a
// static SVG, same reasoning as TagIcon/ShowroomIcon above.
export function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.25 w-4.25" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}
