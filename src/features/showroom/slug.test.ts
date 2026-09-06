import { describe, expect, it } from "vitest";
import { getShowroomDetailPath, getShowroomNameSlug, parseShowroomIdFromSlug } from "./slug";

describe("getShowroomNameSlug / getShowroomDetailPath", () => {
  const showroom = { id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", businessName: "Mr CarScout" };

  it("builds the name slug as {business-name-slug}-{id}", () => {
    expect(getShowroomNameSlug(showroom)).toBe("mr-carscout-3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("builds the full detail path", () => {
    expect(getShowroomDetailPath(showroom)).toBe("/showrooms/mr-carscout-3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("falls back to just the id when the business name slugifies to nothing", () => {
    expect(getShowroomNameSlug({ ...showroom, businessName: "!!!" })).toBe(showroom.id);
  });
});

describe("parseShowroomIdFromSlug", () => {
  it("recovers the id from the end of a real slug", () => {
    expect(parseShowroomIdFromSlug("mr-carscout-3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("recovers the id when the slug is just the bare id (no name prefix)", () => {
    expect(parseShowroomIdFromSlug("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("is case-insensitive but normalizes to lowercase", () => {
    expect(parseShowroomIdFromSlug("mr-carscout-3FA85F64-5717-4562-B3FC-2C963F66AFA6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("returns null for a too-short slug", () => {
    expect(parseShowroomIdFromSlug("not-a-real-id")).toBeNull();
  });

  it("returns null when the trailing 36 characters aren't a well-formed UUID", () => {
    expect(parseShowroomIdFromSlug("mr-carscout-zzzzzzzz-5717-4562-b3fc-2c963f66afa6")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseShowroomIdFromSlug("")).toBeNull();
  });
});
