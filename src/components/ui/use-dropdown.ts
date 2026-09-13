"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Generic open/close state for any dropdown/popover: closes on an outside
 * click or Escape. Extracted from header.tsx's own NavDropdown/Profile menu
 * (which still uses it) once a second, unrelated caller (the vehicle detail
 * page's share popover) needed the exact same behavior.
 */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, setOpen, ref };
}
