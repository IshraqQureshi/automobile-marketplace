"use client";

interface ScrollToSectionLinkProps {
  targetId: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A plain `<a href="#id">` jumps instantly by default — this animates the
 * scroll instead (e.g. the vehicle detail page's HP Installments/Bank
 * Finance buttons scrolling down to the Financing Calculator section).
 * Scoped to just this one link rather than a site-wide `scroll-behavior:
 * smooth` on <html>, which would also animate every other in-page anchor
 * and Next's own route-change scroll reset — neither of which was asked
 * for. Falls back to the browser's default instant jump if the target
 * isn't found (shouldn't happen in practice, but never worse than a plain
 * anchor would be), and respects prefers-reduced-motion.
 */
export function ScrollToSectionLink({ targetId, className, children }: ScrollToSectionLinkProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
