"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Catches errors thrown by the root layout itself (Header/Footer, etc.) —
 * error.tsx alone can't, since it renders inside the layout it's meant to
 * protect. Must render its own <html>/<body> since the root layout may be
 * what failed.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Unhandled root layout error", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Something went wrong</h1>
          <p className="max-w-sm text-sm text-neutral-500">
            An unexpected error occurred. Try again, or come back later if the problem persists.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
