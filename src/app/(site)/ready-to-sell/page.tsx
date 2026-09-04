import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ready to Sell? — HarakaGari",
};

export default function ReadyToSellPage() {
  return (
    <main className="bg-neutral-50 px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">Join HarakaGari</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-neutral-900">Ready to Sell?</h1>
        <p className="mt-2 text-sm text-neutral-500">Choose how you&apos;d like to list your vehicles on HarakaGari.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <SellOptionCard
            title="Individual Seller"
            price="Pay per listing"
            description="List your personal vehicle — quick and easy"
            bullets={[
              "List your personal vehicle in minutes",
              "Reach buyers searching right now",
              "Advertisement handled by HarakaGari",
              "Manage inquiries from your dashboard",
            ]}
            ctaLabel="Register Now"
            disabled
          />
          <SellOptionCard
            title="Showroom"
            price="KSh 60,000 / quarterly"
            description="List your entire dealership inventory"
            bullets={[
              "Unlimited vehicle listings",
              "Verified showroom badge & profile",
              "Advertisement handled by HarakaGari",
              "Dedicated account manager",
            ]}
            ctaLabel="Register Now"
            href="/register-showroom"
          />
        </div>
      </div>
    </main>
  );
}

interface SellOptionCardProps {
  title: string;
  price: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  href?: string;
  disabled?: boolean;
}

function SellOptionCard({ title, price, description, bullets, ctaLabel, href, disabled }: SellOptionCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-brand">{price}</p>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>

      <ul className="mt-4 flex-1 space-y-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-neutral-600">
            <CheckIcon />
            {bullet}
          </li>
        ))}
      </ul>

      {disabled || !href ? (
        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-6 rounded-md border border-neutral-200 px-4 py-2.5 text-center text-sm font-medium text-neutral-400 disabled:cursor-default"
        >
          {ctaLabel} — Coming soon
        </button>
      ) : (
        <Link
          href={href}
          className="mt-6 rounded-md bg-brand px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-dark"
        >
          {ctaLabel} →
        </Link>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="mt-0.5 shrink-0 text-brand">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
