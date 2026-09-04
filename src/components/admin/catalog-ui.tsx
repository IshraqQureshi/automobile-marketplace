import type { ReactNode } from "react";

/**
 * Shared visual building blocks for the three catalog CRUD cards
 * (CatalogList, CatalogModelsList, CatalogBrandsList) — kept here so the
 * three components don't each reinvent row-action buttons, header layout,
 * and the name-initial avatar fallback with slightly different markup.
 */

interface CatalogCardHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  count: number;
}

export function CatalogCardHeader({ icon, title, description, count }: CatalogCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</span>
        <div>
          <h2 className="font-display text-base font-semibold text-neutral-900">{title}</h2>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 tabular-nums">{count}</span>
    </div>
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

export function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 17V11l2-5h14l2 5v6" />
      <path d="M3 11h18" />
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
