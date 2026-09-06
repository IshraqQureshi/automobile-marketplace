// Pulled out of components/vehicle/pagination.tsx so this pure page-number
// logic is unit-testable without pulling in next/link/React (same reasoning
// as homepage-highlight-upload.ts's split from its "use client" caller).
const MAX_PAGES_BEFORE_WINDOWING = 7;

export function buildPageNumbers(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= MAX_PAGES_BEFORE_WINDOWING) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i]!;
    if (i > 0 && page - sorted[i - 1]! > 1) result.push("…");
    result.push(page);
  }
  return result;
}
