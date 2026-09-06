import { describe, expect, it } from "vitest";
import { buildPageNumbers } from "./pagination-utils";

describe("buildPageNumbers", () => {
  it("returns every page with no ellipsis when the total is small", () => {
    expect(buildPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns a single page for totalPages 1", () => {
    expect(buildPageNumbers(1, 1)).toEqual([1]);
  });

  it("inserts an ellipsis after page 1 when the current page is far into a large range", () => {
    expect(buildPageNumbers(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
  });

  it("has no leading ellipsis when the current page is at the start", () => {
    expect(buildPageNumbers(1, 20)).toEqual([1, 2, "…", 20]);
  });

  it("has no trailing ellipsis when the current page is at the end", () => {
    expect(buildPageNumbers(20, 20)).toEqual([1, "…", 19, 20]);
  });

  it("never duplicates a page number even when neighbors overlap the boundaries", () => {
    expect(buildPageNumbers(2, 3)).toEqual([1, 2, 3]);
  });
});
