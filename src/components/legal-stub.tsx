interface LegalStubProps {
  title: string;
}

/**
 * Placeholder for legal content the client hasn't supplied yet (see
 * MVP_PROGRESS.md blocker B-006). Honest about being unfinished rather than
 * inventing legal text — this is exactly the kind of content that must come
 * from the client/legal counsel, not be fabricated.
 */
export function LegalStub({ title }: LegalStubProps) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-4 text-neutral-500">
        This page is a placeholder. Final {title.toLowerCase()} content has not yet been supplied by
        the client and will be published here before production launch.
      </p>
    </main>
  );
}
