"use client";

import { toCsv } from "@/features/analytics/csv";

export interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

// Column-def shape (label + typed value getter per row) is more convenient
// here than the analytics export's plain headers/rows arrays — these admin
// lists already hold typed row objects, not pre-flattened arrays. The
// actual CSV serialization/escaping is NOT duplicated though: this defers
// to the same toCsv() every other export in the app uses, so there's a
// single place that knows how to escape a field (including the
// formula-injection guard) rather than two copies to keep in sync.
export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headers = columns.map((c) => c.label);
  const cells = rows.map((row) => columns.map((c) => c.value(row) ?? ""));
  return toCsv(headers, cells);
}

interface ExportCsvButtonProps<T> {
  data: T[];
  columns: CsvColumn<T>[];
  filename: string; // without extension
}

/**
 * Pure client-side CSV export — builds the file from data already loaded
 * on the page (every admin list here already loads its full dataset
 * client-side, same "no pagination at this scale" convention the lists
 * themselves already follow) and triggers a browser download via a
 * temporary Blob URL. No network request, no server route needed.
 */
export function ExportCsvButton<T>({ data, columns, filename }: ExportCsvButtonProps<T>) {
  function handleExport() {
    const csv = buildCsv(data, columns);
    // A UTF-8 BOM so Excel (which otherwise guesses the wrong encoding for
    // non-ASCII characters) opens this correctly — same fix already applied
    // in the analytics export button.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={data.length === 0}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <DownloadIcon />
      Export CSV
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
