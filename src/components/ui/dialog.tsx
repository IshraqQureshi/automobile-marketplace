"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  // "md" (default) fits every existing create/edit form; "lg" is for
  // content-heavier dialogs (e.g. a review panel with an inline document
  // preview) that would otherwise feel cramped at max-w-md.
  size?: "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<DialogProps["size"]>, string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

/**
 * Minimal accessible modal — no dependency added for this (no Radix/headlessui
 * in the project yet); a portal + Escape-to-close + overlay-click-to-close +
 * initial focus covers what this admin UI actually needs.
 */
export function Dialog({ open, onClose, title, description, children, size = "md" }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // onClose is a plain function recreated on every render of the caller
  // (e.g. `function closeDialog() {...}` inside a component body, not
  // wrapped in useCallback) — every keystroke in a form field inside this
  // dialog re-renders the caller and hands Dialog a new onClose reference.
  // Keeping it out of the effect's dependency array (via a ref that always
  // holds the latest callback) means the effect below only re-runs on a
  // genuine open/close transition, not on every keystroke — otherwise
  // `panelRef.current?.focus()` re-fires on every render while typing,
  // stealing focus from the input back to the dialog panel after the very
  // first character (confirmed live: typing "Toyota" produced "T").
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Basic focus trap: without this, Tab/Shift+Tab can walk focus out of
      // the panel into the (visually covered, but not actually inert)
      // background page — including the tab bar behind this dialog on the
      // catalog page, whose button still responds to a keyboard-triggered
      // click even though a mouse click on the same spot is correctly
      // blocked by the overlay below. A real modal must not allow that.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        className={`relative max-h-[90vh] w-full ${SIZE_CLASSES[size]} overflow-y-auto rounded-xl bg-white p-6 shadow-xl outline-none`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="font-display text-lg font-semibold text-neutral-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
