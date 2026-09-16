"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/features/favorites/actions";

interface FavoriteButtonProps {
  vehicleId: string;
  initialFavorited: boolean;
  isSignedIn: boolean;
}

/**
 * Heart toggle for a vehicle's favorite state (AUTH-005). A signed-out
 * visitor is sent to /login rather than getting a disabled button or a
 * silent no-op — clicking it is a clear enough intent to act on.
 *
 * No toast here — unlike the dashboard/admin trees, the public (site)
 * layout has no ToastProvider (confirmed: no other public vehicle
 * component, e.g. VehicleInquiryButton, uses useToast either) — errors
 * surface as inline text instead, same convention those use.
 */
export function FavoriteButton({ vehicleId, initialFavorited, isSignedIn }: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await toggleFavoriteAction(vehicleId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFavorited(result.favorited ?? false);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={favorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorited}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          favorited ? "border-red-200 bg-red-50 text-red-500" : "border-neutral-300 bg-white text-neutral-400 hover:text-neutral-600"
        }`}
      >
        <HeartIcon filled={favorited} />
      </button>
      {error && (
        // Same mobile-overflow issue as ShareButton's popover/toast (see
        // its own comment) — this sits in the identical header row, which
        // stacks to put the button near the LEFT edge on mobile but stays
        // right-aligned on desktop. left-0/text-left below md, right-0/
        // text-right (unchanged) at md and up.
        <p
          role="alert"
          className="absolute top-full left-0 z-10 mt-1 w-max max-w-52 text-left text-xs text-red-600 md:left-auto md:right-0 md:text-right"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
