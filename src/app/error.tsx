"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Unhandled render error", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">Something went wrong</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        An unexpected error occurred. Try again, or come back later if the problem persists.
      </p>
      <Button type="button" onClick={reset} className="w-auto px-6">
        Try again
      </Button>
    </main>
  );
}
