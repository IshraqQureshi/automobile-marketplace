// Shared brand/utility icons for social sharing — used by the footer's own
// "Follow us" links and the vehicle detail page's share popover, which need
// the exact same Facebook/X/Instagram marks. Extracted here once a second,
// unrelated consumer needed them rather than each keeping its own copy.

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M15 8.5h2V5.2c-.35-.05-1.54-.15-2.93-.15-2.91 0-4.9 1.78-4.9 5.04V13H6.5v3.7h3.17V23h3.7v-6.3h3.05l.48-3.7h-3.53v-2.5c0-1.07.29-1.8 1.83-1.8Z" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M18.24 3h3.06l-6.69 7.64L22.5 21h-6.16l-4.83-6.32L5.98 21H2.92l7.16-8.18L2 3h6.32l4.37 5.78L18.24 3Zm-1.07 16.2h1.7L7.13 4.71H5.3L17.17 19.2Z" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.98h4v10.02H3zM9.5 9.98h3.83v1.37h.05c.53-1 1.84-2.06 3.78-2.06 4.04 0 4.79 2.66 4.79 6.12v6.6h-4v-5.85c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.53-2.25 3.1v5.95h-4V9.98Z" />
    </svg>
  );
}

export function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function CopyLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M9 9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2" />
      <rect x="3" y="9" width="9" height="12" rx="2" />
    </svg>
  );
}
