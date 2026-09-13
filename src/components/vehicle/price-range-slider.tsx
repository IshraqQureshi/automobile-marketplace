"use client";

import { useId, useState } from "react";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  // Current filter values (null = not set, defaults to the bound) — kept
  // as separate named inputs (minPrice/maxPrice) rather than one combined
  // field, so this drops straight into the existing plain GET <form> (see
  // vehicle-filters.tsx) with zero change to how the server reads them.
  defaultMinPrice: number | null;
  defaultMaxPrice: number | null;
}

const PRICE_STEP = 10_000; // KES — fine enough to feel continuous, coarse enough that dragging doesn't take forever across an 18M+ range

function formatKsh(value: number) {
  return `Ksh ${value.toLocaleString("en-KE")}`;
}

/**
 * Two native range inputs stacked on the same track (the standard
 * dependency-free dual-handle slider technique) — each input's own
 * invisible track has pointer-events disabled via CSS so only its thumb is
 * clickable/draggable, letting clicks reach whichever handle is underneath.
 * Replaces the old plain number-entry Min/Max boxes per direct request —
 * dragging a bounded slider also structurally can't produce the kind of
 * malformed/out-of-range value a free-text number field could.
 */
export function PriceRangeSlider({ min, max, defaultMinPrice, defaultMaxPrice }: PriceRangeSliderProps) {
  const minId = useId();
  const maxId = useId();
  const [minValue, setMinValue] = useState(defaultMinPrice ?? min);
  const [maxValue, setMaxValue] = useState(defaultMaxPrice ?? max);

  // A few px of overlap tolerance so the two thumbs never fully swap past
  // each other and get stuck (real usability issue with this dual-input
  // technique otherwise).
  const gap = Math.max(PRICE_STEP, Math.round((max - min) * 0.01));

  function handleMinChange(next: number) {
    setMinValue(Math.min(next, maxValue - gap));
  }
  function handleMaxChange(next: number) {
    setMaxValue(Math.max(next, minValue + gap));
  }

  const minPercent = max > min ? ((minValue - min) / (max - min)) * 100 : 0;
  const maxPercent = max > min ? ((maxValue - min) / (max - min)) * 100 : 100;

  return (
    <div className="col-span-2 sm:col-span-3 lg:col-span-1">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-600">
        <span>Price range</span>
        <span className="font-normal text-neutral-500" aria-hidden="true">
          {formatKsh(minValue)} – {formatKsh(maxValue)}
        </span>
      </div>

      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-neutral-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          id={minId}
          type="range"
          name="minPrice"
          min={min}
          max={max}
          step={PRICE_STEP}
          value={minValue}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          aria-label="Minimum price"
          className="price-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
        />
        <input
          id={maxId}
          type="range"
          name="maxPrice"
          min={min}
          max={max}
          step={PRICE_STEP}
          value={maxValue}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          aria-label="Maximum price"
          className="price-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
        />
      </div>

      <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
        <span>{formatKsh(min)}</span>
        <span>{formatKsh(max)}</span>
      </div>
    </div>
  );
}
