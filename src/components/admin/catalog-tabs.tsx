"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CatalogTabsProps {
  brands: ReactNode;
  brandCount: number;
  models: ReactNode;
  modelCount: number;
  types: ReactNode;
  typeCount: number;
}

type TabKey = "brands" | "models" | "types";

/**
 * Full-width tabbed layout — replaces the earlier three-columns-squeezed-
 * side-by-side layout. Panels use `hidden` rather than unmounting on tab
 * switch, so each panel (and any in-progress form state inside it) survives
 * switching away and back.
 */
export function CatalogTabs({ brands, brandCount, models, modelCount, types, typeCount }: CatalogTabsProps) {
  const [active, setActive] = useState<TabKey>("brands");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "brands", label: "Brands", count: brandCount },
    { key: "models", label: "Models", count: modelCount },
    { key: "types", label: "Types", count: typeCount },
  ];

  return (
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
  );
}
