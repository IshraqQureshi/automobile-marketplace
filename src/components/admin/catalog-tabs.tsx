"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabKey = "brands" | "models" | "types";

// Each list reads whether it's the active tab via this context rather than
// via a prop CatalogTabs injects into it (e.g. cloneElement) — brands/
// models/types are Client Component elements created by a Server Component
// (page.tsx) and passed across the server/client boundary as props; cloning
// one of those elements on the client breaks Next.js's element resolution
// entirely (confirmed live: the whole page crashed with "Element type is
// invalid... got: undefined", reproducible even after a full `.next` cache
// clear, so not a dev-server fluke). Context read from inside the already-
// client-rendered list component sidesteps that boundary problem.
const ActiveCatalogTabContext = createContext<TabKey>("brands");

export function useIsActiveCatalogTab(tabKey: TabKey) {
  return useContext(ActiveCatalogTabContext) === tabKey;
}

interface CatalogTabsProps {
  brands: ReactNode;
  brandCount: number;
  models: ReactNode;
  modelCount: number;
  types: ReactNode;
  typeCount: number;
}

/**
 * Full-width tabbed layout — replaces the earlier three-columns-squeezed-
 * side-by-side layout. Panels use `hidden` rather than unmounting on tab
 * switch, so each panel (and any in-progress form state inside it) survives
 * switching away and back. The one exception is a panel's own open dialog:
 * see useIsActiveCatalogTab above and each list component's use of it.
 */
export function CatalogTabs({ brands, brandCount, models, modelCount, types, typeCount }: CatalogTabsProps) {
  const [active, setActive] = useState<TabKey>("brands");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "brands", label: "Brands", count: brandCount },
    { key: "models", label: "Models", count: modelCount },
    { key: "types", label: "Types", count: typeCount },
  ];

  return (
    <ActiveCatalogTabContext.Provider value={active}>
      <div>
        <div role="tablist" aria-label="Catalog sections" className="mb-5 flex gap-1 border-b border-neutral-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active === tab.key ? "border-brand text-brand" : "border-transparent text-neutral-500 hover:text-neutral-800",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  active === tab.key ? "bg-brand/10 text-brand" : "bg-neutral-100 text-neutral-500",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div hidden={active !== "brands"}>{brands}</div>
        <div hidden={active !== "models"}>{models}</div>
        <div hidden={active !== "types"}>{types}</div>
      </div>
    </ActiveCatalogTabContext.Provider>
  );
}
