export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
    </main>
  );
}
