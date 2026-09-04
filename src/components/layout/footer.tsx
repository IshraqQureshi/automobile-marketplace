import Link from "next/link";

/**
 * Brand/Model/Type lists and social links are static per the design layout,
 * not live data or real destinations — no vehicle taxonomy exists yet
 * (MKT-003) and there are no real HarakaGari social accounts. Rendered as
 * inert text rather than dead/misleading links. Legal links are real —
 * see the stub pages under src/app/(site)/(legal) and blocker B-006 for real
 * content.
 */
const FOOTER_COLUMNS = {
  Brands: ["BMW", "Mercedes-Benz", "Audi", "Toyota", "Porsche", "Tesla", "Honda", "Hyundai", "Volkswagen", "Range Rover"],
  Model: ["3 Series", "C-Class", "A4", "Camry", "Supra GR", "Model 3", "Civic", "Tucson", "Golf", "Defender"],
  Type: ["Sedan", "SUV", "Coupe", "Hatchback", "Pickup", "Convertible", "Wagon", "Electric", "Hybrid", "Diesel"],
} as const;

const SOCIAL_LINKS = ["Facebook", "X (Twitter)", "Instagram", "YouTube"] as const;

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {Object.entries(FOOTER_COLUMNS).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-xs font-semibold tracking-wide text-white/50">{title.toUpperCase()}</h3>
              <ul className="mt-4 space-y-2">
                {items.map((item) => (
                  <li key={item} className="text-sm text-white/70">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-white/50">FOLLOW US</h3>
            <ul className="mt-4 space-y-2">
              {SOCIAL_LINKS.map((item) => (
                <li key={item} className="text-sm text-white/70">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/50 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} HarakaGari by Arresa. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/80">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/80">
              Terms of Service
            </Link>
            <Link href="/cookie-policy" className="hover:text-white/80">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
