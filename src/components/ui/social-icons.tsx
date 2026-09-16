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

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.05 22h-.004a9.97 9.97 0 0 1-4.77-1.216L2 22l1.24-5.148A9.955 9.955 0 0 1 2.05 12.05C2.045 6.526 6.53 2.045 12.056 2.045c2.677.001 5.19 1.043 7.083 2.938a9.936 9.936 0 0 1 2.93 7.084c-.003 5.524-4.487 10.005-10.02 10.005Z"
      />
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.74a8.27 8.27 0 0 0 4.83 1.54V6.84a4.85 4.85 0 0 1-1.07-.15z" />
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
