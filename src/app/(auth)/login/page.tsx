import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "./auth-card";

export const metadata: Metadata = {
  title: "Log in — HarakaGari",
};

// Self-hosted via next/font (no runtime Google Fonts request) — used only
// for the hero stats figures per design instruction, not the site-wide
// display font (see --font-display in globals.css for that).
const fraunces = Fraunces({ subsets: ["latin"], weight: ["600"] });

const HOW_IT_WORKS = [
  { step: "01", title: "Find a Car", description: "Explore cars from showrooms and dealers on our platform." },
  { step: "02", title: "Book a Visit", description: "Book an appointment directly with your selected showroom." },
  { step: "03", title: "Buy & Lock", description: "Purchase your selected vehicle and register your transaction with us." },
  { step: "04", title: "Upload & Earn", description: "Buy through our platform. Submit your purchase. Get rewarded." },
] as const;

// Matches design/login-page.png and design/signup-page.png exactly.
// NOTE (2026-09-05): these are the design mockup's own illustrative
// figures, not numbers backed by real platform data — logged explicitly
// in MVP_PROGRESS.md rather than silently treated as real metrics. Added
// back per explicit instruction after being deliberately omitted earlier.
const STATS = [
  { value: "12,400+", label: "Cars listed" },
  { value: "800+", label: "Verified dealers" },
  { value: "47 cities", label: "Across Kenya" },
] as const;

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <div className="grid lg:grid-cols-2">
      <main className="flex items-center justify-center px-6 py-16">
        <AuthCard />
      </main>

      <aside className="relative hidden overflow-hidden lg:block">
        <Image src="/login-hero.jpeg" alt="" fill priority className="object-cover" sizes="50vw" />
        <div className="from-ink via-ink/85 absolute inset-0 bg-gradient-to-br to-brand-dark/80" />

        <div className="relative flex h-full flex-col justify-center gap-10 px-12 py-16 text-white">
          <div>
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-brand">
              POWERED BY ARRESA
            </span>
            <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
              Drive your
              <br />
              next chapter.
            </h2>
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Kenya&apos;s premium car marketplace. Verified dealers, bank finance, and HP
              installments — all in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Verified Dealers", "Bank Finance", "Secure Transactions"].map((badge) => (
                <span key={badge} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  ✓ {badge}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium tracking-wide text-white/50">GETTING STARTED</span>
            <h3 className="font-display mt-1 text-xl font-semibold">How It Works</h3>
            <ol className="mt-5 space-y-5">
              {HOW_IT_WORKS.map(({ step, title, description }) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-brand">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-white/60">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-8 border-t border-white/10 pt-6">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className={`${fraunces.className} text-2xl font-semibold`}>{value}</p>
                <p className="text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
