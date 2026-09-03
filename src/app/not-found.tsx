import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">Page not found</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/" className="text-sm font-medium text-brand hover:underline">
        Back to homepage
      </Link>
    </main>
  );
}
