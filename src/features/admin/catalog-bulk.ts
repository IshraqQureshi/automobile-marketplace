import { catalogNameSchema } from "./catalog-schemas";

export type CatalogBulkKind = "brands" | "models" | "types";

export interface CatalogBulkRow {
  name: string;
  // Only set for models — the brand the model belongs to, matched by name.
  brand?: string;
}

export interface CatalogBulkIssue {
  line: number;
  message: string;
}

export interface CatalogBulkParseResult {
  rows: CatalogBulkRow[];
  issues: CatalogBulkIssue[];
}

export const MAX_BULK_ROWS = 1000;

export const BULK_KIND_CONFIG: Record<CatalogBulkKind, { label: string; header: string; example: string }> = {
  brands: { label: "Brands", header: "name", example: "Toyota\nNissan\nHonda" },
  models: { label: "Models", header: "brand,name", example: "Toyota,Corolla\nToyota,Yaris\nNissan,X-Trail" },
  types: { label: "Types", header: "name", example: "Sedan\nSUV\nPickup" },
};

/** CSV text a user can download/paste as a starting point. */
export function catalogBulkTemplate(kind: CatalogBulkKind): string {
  const { header, example } = BULK_KIND_CONFIG[kind];
  return `${header}\n${example}\n`;
}

/**
 * Minimal RFC-4180 style parser: quoted fields, escaped quotes ("") and
 * commas/newlines inside quotes. No dependency — the catalog only needs
 * plain text columns.
 */
export function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else {
      field += char;
    }
  }
  record.push(field);
  records.push(record);

  return records;
}

/**
 * Turns CSV text into validated rows for one catalog kind. Never throws —
 * bad lines are reported in `issues` (with their 1-based line number) and
 * the good lines are still returned. Duplicates inside the file are
 * collapsed (case-insensitive) rather than reported as errors.
 */
export function parseCatalogCsv(text: string, kind: CatalogBulkKind): CatalogBulkParseResult {
  const records = parseCsv(text);
  const rows: CatalogBulkRow[] = [];
  const issues: CatalogBulkIssue[] = [];
  const seen = new Set<string>();
  const columnCount = kind === "models" ? 2 : 1;
  let headerSkipped = false;

  for (let index = 0; index < records.length; index++) {
    const line = index + 1;
    const record = records[index]!.map((cell) => cell.trim());
    if (record.every((cell) => cell === "")) continue;

    // Optional header row: first non-empty line that is literally the
    // expected column names.
    if (!headerSkipped) {
      headerSkipped = true;
      const expected = BULK_KIND_CONFIG[kind].header.split(",");
      if (expected.every((column, i) => record[i]?.toLowerCase() === column)) continue;
    }

    if (record.length > columnCount && record.slice(columnCount).some((cell) => cell !== "")) {
      issues.push({ line, message: kind === "models" ? "Expected 2 columns: brand,name." : "Expected a single column: name." });
      continue;
    }

    const brandCell = kind === "models" ? (record[0] ?? "") : undefined;
    const nameCell = kind === "models" ? (record[1] ?? "") : (record[0] ?? "");

    if (kind === "models" && !brandCell) {
      issues.push({ line, message: "Brand is required." });
      continue;
    }
    const parsedName = catalogNameSchema.safeParse(nameCell);
    if (!parsedName.success) {
      issues.push({ line, message: parsedName.error.issues[0]?.message ?? "Invalid name." });
      continue;
    }

    const key = `${(brandCell ?? "").toLowerCase()}\u0000${parsedName.data.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(kind === "models" ? { brand: brandCell, name: parsedName.data } : { name: parsedName.data });
  }

  if (rows.length > MAX_BULK_ROWS) {
    return { rows: [], issues: [{ line: 0, message: `Too many rows — upload at most ${MAX_BULK_ROWS} at a time.` }] };
  }

  return { rows, issues };
}
