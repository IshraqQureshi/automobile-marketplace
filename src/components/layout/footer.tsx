import Link from "next/link";
import { FacebookIcon, InstagramIcon, TikTokIcon, XIcon } from "@/components/ui/social-icons";
import { buildBrandCatalogLinks, buildModelCatalogLinks, buildTypeCatalogLinks, type NavCatalog } from "@/features/vehicle/nav-catalog-links";

export interface FooterSocialLinks {
  facebookUrl: string;
  instagramUrl: string;
  xUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
}

interface FooterProps {
  navCatalog: NavCatalog;
  socialLinks: FooterSocialLinks;
  isSignedIn: boolean;
}

const FOOTER_COLUMN_TITLES = { brands: "Brands", models: "Model", types: "Type" } as const;

// The original design shipped exactly 10 static items per column — capping
// here keeps that shape as the real catalog grows (models in particular
// grows fastest, many-per-brand) rather than letting a footer column turn
// into an unbounded wall of links. The header's own nav dropdowns solve the
// same growth problem with a scrollable max-height instead, since a
// dropdown can scroll where a footer shouldn't.
const FOOTER_COLUMN_LIMIT = 10;

const SOCIAL_PLATFORMS = [
  { key: "facebookUrl", label: "Facebook", icon: FacebookIcon },
  { key: "xUrl", label: "X (Twitter)", icon: XIcon },
  { key: "instagramUrl", label: "Instagram", icon: InstagramIcon },
  { key: "youtubeUrl", label: "YouTube", icon: YouTubeIcon },
  { key: "tiktokUrl", label: "TikTok", icon: TikTokIcon },
] as const;

export function Footer({ navCatalog, socialLinks, isSignedIn }: FooterProps) {
  // Real SEO-friendly links now (previously static inert text) — same
  // brand/model/type catalog + href-building logic the header's own nav
  // dropdowns use, so the two can't silently resolve differently.
  const brandLinks = buildBrandCatalogLinks(navCatalog.brands).slice(0, FOOTER_COLUMN_LIMIT);
  const modelLinks = buildModelCatalogLinks(navCatalog.models).slice(0, FOOTER_COLUMN_LIMIT);
  const typeLinks = buildTypeCatalogLinks(navCatalog.types).slice(0, FOOTER_COLUMN_LIMIT);

  const activeSocialLinks = SOCIAL_PLATFORMS.filter((platform) => socialLinks[platform.key]);

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterLinkColumn title={FOOTER_COLUMN_TITLES.brands} items={brandLinks} />
          <FooterLinkColumn title={FOOTER_COLUMN_TITLES.models} items={modelLinks} />
          <FooterLinkColumn title={FOOTER_COLUMN_TITLES.types} items={typeLinks} />

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-white/50">FOLLOW US</h3>
            {activeSocialLinks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {activeSocialLinks.map(({ key, label, icon: Icon }) => (
                  <a
                    key={key}
                    href={socialLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            ) : (
              // Admin hasn't configured any social profile links yet — no
              // dead/placeholder icons, same "don't link to nowhere"
              // convention the Brands/Model/Type columns themselves follow.
              <p className="mt-4 text-sm text-white/40">Coming soon</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/50 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} HarakaGari by Arresa. All rights reserved.</span>
          {/* /register-showroom is public again per direct request — see
              registerShowroomPublicAction — reversing an earlier decision
              that had removed every nav link to it. Hidden once signed in
              (any role) per direct follow-up request — a signed-in user
              either already owns a showroom or isn't the audience for this
              link. */}
          <div className="flex gap-4">
            {!isSignedIn && (
              <Link href="/register-showroom" className="hover:text-white/80">
                Register Showroom
              </Link>
            )}
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

function FooterLinkColumn({ title, items }: { title: string; items: { id: string; label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-white/50">{title.toUpperCase()}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="text-sm text-white/70 hover:text-white">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        // Catalog table empty (fresh install) — same "don't link to
        // nowhere" reasoning as the Follow Us column's empty state.
        <p className="mt-4 text-sm text-white/40">Coming soon</p>
      )}
    </div>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4h0s-3.9 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.7v1.6c0 1.8.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.9.8 2.3.9 1.7.2 7.1.2 7.1.2S9.9 19 12.7 18.8c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5v-1.6c0-1.8-.2-3.5-.2-3.5ZM9.9 14.6V8.9l5.4 2.9-5.4 2.8Z" />
    </svg>
  );
}

