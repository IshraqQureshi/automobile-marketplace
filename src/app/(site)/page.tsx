import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">HarakaGari</h1>
      <p className="text-sm text-neutral-500">
        Project scaffold running. Marketplace homepage (MKT-001) not yet implemented.
      </p>
      <Link href="/login" className="text-sm text-brand hover:underline">
        Log in / Sign up
      </Link>
    </main>
  );
}
