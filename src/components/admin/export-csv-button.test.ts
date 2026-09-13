import { describe, expect, it } from "vitest";
import { buildCsv, type CsvColumn } from "./export-csv-button";

interface FixtureRow {
  name: string;
  count: number;
  note: string | null;
}

const COLUMNS: CsvColumn<FixtureRow>[] = [
  { label: "Name", value: (r) => r.name },
  { label: "Count", value: (r) => r.count },
  { label: "Note", value: (r) => r.note },
];

describe("buildCsv", () => {
  it("builds a header row from column labels and one row per data item", () => {
    const rows: FixtureRow[] = [{ name: "Toyota", count: 5, note: null }];
    expect(buildCsv(rows, COLUMNS)).toBe("Name,Count,Note\r\nToyota,5,");
  });

  it("neutralizes a leading =, +, -, or @ to prevent CSV formula injection", () => {
    const rows: FixtureRow[] = [{ name: "=SUM(A1:A9)", count: 1, note: "@example.com" }];
    const csv = buildCsv(rows, COLUMNS);
    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).toContain("'@example.com");
  });

  it("escapes a value containing a comma", () => {
    const rows: FixtureRow[] = [{ name: "Rift Valley, Nairobi", count: 2, note: null }];
    expect(buildCsv(rows, COLUMNS)).toBe('Name,Count,Note\r\n"Rift Valley, Nairobi",2,');
  });
});
