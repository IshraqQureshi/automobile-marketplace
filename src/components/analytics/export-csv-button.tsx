"use client";

import { toCsv } from "@/features/analytics/csv";

interface ExportCsvButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Builds and downloads a CSV client-side from data the page already
 * fetched server-side — no round trip needed, the export button just
 * serializes what's already on the page. A Blob + temporary <a download>
 * is the standard browser-download mechanism (no library needed for
 * something this small).
 */
export function ExportCsvButton({ filename, headers, rows }: ExportCsvButtonProps) {
  function handleExport() {
    const csv = toCsv(headers, rows);
    // A UTF-8 BOM so Excel (which otherwise guesses the wrong encoding for
    // non-ASCII characters, e.g. a customer's name) opens this correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <DownloadIcon />
      Export CSV
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  );
}
