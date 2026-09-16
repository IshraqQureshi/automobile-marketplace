import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { resolveLoggedInHomePath } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "./auth-card";

export const metadata: Metadata = {
  title: "Log in — HarakaGari",
  description: "Log in to HarakaGari to browse saved searches, message showrooms, and manage your showroom or account.",
  alternates: { canonical: "/login" },
};

const HOW_IT_WORKS = [
  { step: "01", title: "Find a Car", description: ["Explore cars from showrooms and dealers on our platform."] },
  { step: "02", title: "Book a Visit", description: ["Book an appointment directly with your selected showroom."] },
  { step: "03", title: "Buy & Lock", description: ["Purchase your selected vehicle and register your transaction with us."] },
] as const;

const REWARD_LINES = ["First Service FREE", "Get KSh 5,000 worth of petrol FREE"] as const;

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await resolveLoggedInHomePath(user.id));
  }

  return (
    <div className="grid lg:grid-cols-2">
      <main className="flex flex-col items-center justify-center px-6 py-16">
        {/* The Reward callout on the right is a desktop-only decorative
            panel (`hidden lg:block` below) — without this, a mobile visitor
            never sees it at all. lg:hidden here so it's never duplicated
            once the full panel takes over at the lg breakpoint. */}
        <div className="mb-5 w-full max-w-sm rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-center lg:hidden">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">Reward</p>
          {REWARD_LINES.map((line) => (
            <p key={line} className="mt-0.5 text-sm text-neutral-700">
              {line}
            </p>
          ))}
        </div>
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
                    {description.map((line) => (
                      <p key={line} className="text-sm text-white/60">
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold">Reward</h3>
            {REWARD_LINES.map((line) => (
              <p key={line} className="mt-1 text-sm text-white/70">
                {line}
              </p>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
