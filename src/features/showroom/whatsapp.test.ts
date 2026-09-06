import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "./whatsapp";

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the number and URL-encoded message", () => {
    expect(buildWhatsAppLink("254712345678", "Hi there")).toBe("https://wa.me/254712345678?text=Hi%20there");
  });

  it("strips any non-digit characters from the number", () => {
    expect(buildWhatsAppLink("+254 712 345 678", "Hi")).toBe("https://wa.me/254712345678?text=Hi");
  });

  it("returns null when the number is empty", () => {
    expect(buildWhatsAppLink("", "Hi")).toBeNull();
  });

  it("returns null when the number has no digits at all", () => {
    expect(buildWhatsAppLink("+()-", "Hi")).toBeNull();
  });
});
