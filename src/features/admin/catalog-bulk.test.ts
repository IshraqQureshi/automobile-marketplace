import { describe, expect, it } from "vitest";
import { MAX_BULK_ROWS, parseCatalogCsv, parseCsv } from "./catalog-bulk";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded commas/newlines, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,"b,1"\r\n"say ""hi""","x\ny"')).toEqual([
      ["a", "b,1"],
      ['say "hi"', "x\ny"],
    ]);
  });
});

describe("parseCatalogCsv", () => {
  it("parses brands with or without a header, skipping blanks", () => {
    expect(parseCatalogCsv("name\nToyota\n\n Nissan \n", "brands").rows).toEqual([{ name: "Toyota" }, { name: "Nissan" }]);
    expect(parseCatalogCsv("Toyota\nNissan", "types").rows).toEqual([{ name: "Toyota" }, { name: "Nissan" }]);
  });

  it("parses models as brand,name", () => {
    const result = parseCatalogCsv("brand,name\nToyota,Corolla\nToyota,Yaris", "models");
    expect(result.rows).toEqual([
      { brand: "Toyota", name: "Corolla" },
      { brand: "Toyota", name: "Yaris" },
    ]);
    expect(result.issues).toEqual([]);
  });

  it("reports bad lines with their line number and keeps the good ones", () => {
    const result = parseCatalogCsv("brand,name\nToyota,Corolla\n,Yaris\nNissan,\nHonda,Civic,extra", "models");
    expect(result.rows).toEqual([{ brand: "Toyota", name: "Corolla" }]);
    expect(result.issues.map((i) => i.line)).toEqual([3, 4, 5]);
  });

  it("rejects names over 100 characters", () => {
    const result = parseCatalogCsv(`name\n${"x".repeat(101)}`, "brands");
    expect(result.rows).toEqual([]);
    expect(result.issues).toHaveLength(1);
  });

  it("collapses case-insensitive duplicates within the file", () => {
    expect(parseCatalogCsv("Toyota\ntoyota\nTOYOTA", "brands").rows).toEqual([{ name: "Toyota" }]);
    expect(parseCatalogCsv("Toyota,Yaris\ntoyota,yaris\nNissan,Yaris", "models").rows).toHaveLength(2);
  });

  it("refuses files over the row limit", () => {
    const text = Array.from({ length: MAX_BULK_ROWS + 1 }, (_, i) => `Brand ${i}`).join("\n");
    const result = parseCatalogCsv(text, "brands");
    expect(result.rows).toEqual([]);
    expect(result.issues[0]?.message).toMatch(/at most/);
  });
});
