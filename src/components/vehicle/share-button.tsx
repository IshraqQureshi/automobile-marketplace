"use client";

import { useState } from "react";
import { useDropdown } from "@/components/ui/use-dropdown";
import { CopyLinkIcon, EmailIcon, FacebookIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon, XIcon } from "@/components/ui/social-icons";

interface ShareButtonProps {
  title: string;
  url: string;
}

/**
 * A popover of direct-share options, per direct request — not the Web
 * Share API's own OS-level sheet, which only some browsers/platforms
 * support and can't be scoped to a specific fixed set of platforms. Each
 * item opens that platform's own real share-intent URL in a small popup
 * window, prefilled with this listing's title/link, except:
 *  - WhatsApp, which has no fixed recipient — wa.me/?text=... opens
 *    WhatsApp with the message ready to send, letting the user pick who
 *    to send it to (same as every other "share to WhatsApp" button).
 *  - Email, which navigates to a real mailto: link (no popup — the OS/
 *    browser handles it, same as clicking any other mailto link).
 *  - Instagram, which has no web share-intent for an arbitrary link at all
 *    (unlike Facebook/X/LinkedIn, its platform doesn't support this) — the
 *    honest thing this button can do is copy the link, same as "Copy
 *    link" itself, not fake a "direct share screen" that doesn't exist.
 */
export function ShareButton({ title, url }: ShareButtonProps) {
  const { open, setOpen, ref } = useDropdown();
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function copyLink(successMessage = "Link copied!") {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(url);
      showFeedback(successMessage);
    } catch {
      // Clipboard access unavailable/denied — nothing more to do silently;
      // the link itself is still visible in the address bar to copy by hand.
    }
  }

  function openShareWindow(shareUrl: string) {
    setOpen(false);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const options: { key: string; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      // No fixed recipient number — https://wa.me/?text=... opens WhatsApp
      // (web or app) with the message pre-filled and lets the user pick
      // who to send it to, same as tapping the native OS share sheet's own
      // WhatsApp entry would.
      onClick: () => openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`),
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <FacebookIcon />,
      onClick: () => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
    },
    {
      key: "x",
      label: "X",
      icon: <XIcon />,
      onClick: () => openShareWindow(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`),
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: <LinkedInIcon />,
      onClick: () => openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`),
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: <InstagramIcon />,
      onClick: () => copyLink("Link copied — paste it in Instagram"),
    },
    {
      key: "email",
      label: "Email",
      icon: <EmailIcon />,
      onClick: () => {
        setOpen(false);
        window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
      },
    },
    {
      key: "copy",
      label: "Copy link",
      icon: <CopyLinkIcon />,
      onClick: () => copyLink(),
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Share this listing"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50"
      >
        <ShareIcon />
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-2 w-48 rounded-lg border border-neutral-200 bg-white py-1.5 shadow-lg">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              onClick={option.onClick}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <span
          role="status"
          className="absolute top-full right-0 z-20 mt-1 w-max max-w-52 rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white"
        >
          {feedback}
        </span>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
