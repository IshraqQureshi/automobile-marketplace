"use client";

import { useState } from "react";

interface ShareButtonProps {
  title: string;
  url: string;
}

/**
 * Uses the native Web Share API where available (mobile browsers, most
 * desktop browsers now too) so sharing goes through whatever apps the
 * device already offers — falls back to copying the link to the clipboard
 * (with a small inline confirmation) everywhere else. No toast here — same
 * reasoning as FavoriteButton: the public (site) route tree has no
 * ToastProvider, only /dashboard and /admin do.
 */
export function ShareButton({ title, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The user closed the native share sheet without picking anything
        // (or the browser blocked it) — not a real error to surface.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access unavailable/denied — nothing more to do silently;
      // the link itself is still visible in the address bar to copy by hand.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        title="Share this listing"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50"
      >
        <ShareIcon />
      </button>
      {copied && (
        <span
          role="status"
          className="absolute top-full right-0 z-10 mt-1 w-max rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white"
        >
          Link copied!
        </span>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
