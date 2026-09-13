import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with commas and CRLF line endings", () => {
    expect(toCsv(["Name", "Count"], [["Toyota", 5]])).toBe("Name,Count\r\nToyota,5");
  });

  it("quotes a field containing a comma", () => {
    expect(toCsv(["Name"], [["Toyota, Land Cruiser"]])).toBe('Name\r\n"Toyota, Land Cruiser"');
  });

  it("quotes a field containing a double quote, doubling the inner quote", () => {
    expect(toCsv(["Name"], [['The "best" car']])).toBe('Name\r\n"The ""best"" car"');
  });

  it("quotes a field containing a newline", () => {
    expect(toCsv(["Notes"], [["line one\nline two"]])).toBe('Notes\r\n"line one\nline two"');
  });

  it("leaves a plain field unquoted", () => {
    expect(toCsv(["Status"], [["CONFIRMED"]])).toBe("Status\r\nCONFIRMED");
  });

  it("handles multiple rows", () => {
    expect(
      toCsv(
        ["Vehicle", "Views"],
        [
          ["Prado", 12],
          ["Hilux", 8],
        ],
      ),
    ).toBe("Vehicle,Views\r\nPrado,12\r\nHilux,8");
  });

  it("handles an empty row list, producing only the header line", () => {
    expect(toCsv(["A", "B"], [])).toBe("A,B");
  });

  it("neutralizes a leading =, +, -, or @ to prevent CSV formula injection", () => {
    expect(toCsv(["Name"], [["=SUM(A1:A9)"]])).toBe("Name\r\n'=SUM(A1:A9)");
    expect(toCsv(["Name"], [["+1234"]])).toBe("Name\r\n'+1234");
    expect(toCsv(["Name"], [["-1234"]])).toBe("Name\r\n'-1234");
    expect(toCsv(["Name"], [["@example.com"]])).toBe("Name\r\n'@example.com");
  });

  it("does not alter a field that merely contains one of those characters mid-string", () => {
    expect(toCsv(["Name"], [["Toyota=Best"]])).toBe("Name\r\nToyota=Best");
  });
});
