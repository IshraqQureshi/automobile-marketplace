import Link from "next/link";
import { buildPageNumbers } from "@/features/vehicle/pagination-utils";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  perPage: number;
  // Builds the href for a given page number — the caller owns how its own
  // filters serialize to a query string (vehicleSearchFiltersToParams,
  // showroomSearchFiltersToParams, ...), so this component itself carries
  // no knowledge of any one feature's filter shape. Originally built
  // vehicle-listing-specific (MKT-002, the first page in this project to
  // need real pagination); generalized once the showroom directory became
  // a second real consumer rather than forking a near-identical copy.
  buildHref: (page: number) => string;
}

export function Pagination({ currentPage, totalCount, perPage, buildHref }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (totalPages <= 1) return null;

  const current = Math.min(currentPage, totalPages);
  const pageNumbers = buildPageNumbers(current, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink href={buildHref(current - 1)} disabled={current <= 1} label="Previous page">
        ←
      </PageLink>

      {pageNumbers.map((page, index) =>
        page === "…" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-sm text-neutral-400">
            …
          </span>
        ) : (
          <PageLink key={page} href={buildHref(page)} active={page === current} label={`Page ${page}`}>
            {page}
          </PageLink>
        ),
      )}

      <PageLink href={buildHref(current + 1)} disabled={current >= totalPages} label="Next page">
        →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span aria-label={label} aria-disabled="true" className="flex h-9 w-9 items-center justify-center rounded-md text-sm text-neutral-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white no-underline"
          : "flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium text-neutral-600 no-underline hover:bg-neutral-100"
      }
    >
      {children}
    </Link>
  );
}
