import { describe, expect, it } from "vitest";
import { highlightVideoUrlSchema, socialLinkFieldSchemas } from "./homepage-highlights-schemas";

// Both of these render straight into a real <a href> — the homepage
// highlight cards (videoUrl) and every page's footer (the social links) —
// so a non-http(s) scheme here is a stored-XSS vector for whichever admin
// account can edit them, not just an "invalid URL" nitpick.
describe("highlightVideoUrlSchema", () => {
  it("accepts a real https URL", () => {
    expect(highlightVideoUrlSchema.safeParse("https://www.youtube.com/watch?v=abc123").success).toBe(true);
  });

  it("rejects a javascript: URL", () => {
    expect(highlightVideoUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rejects a data: URL", () => {
    expect(highlightVideoUrlSchema.safeParse("data:text/html,<script>alert(1)</script>").success).toBe(false);
  });
});

describe("socialLinkFieldSchemas", () => {
  it("accepts an empty string (platform not configured)", () => {
    expect(socialLinkFieldSchemas.facebookUrl.safeParse("").success).toBe(true);
  });

  it("accepts a real https URL", () => {
    expect(socialLinkFieldSchemas.facebookUrl.safeParse("https://www.facebook.com/harakagari").success).toBe(true);
  });

  it("rejects a javascript: URL on every social field", () => {
    for (const schema of Object.values(socialLinkFieldSchemas)) {
      expect(schema.safeParse("javascript:alert(document.cookie)").success).toBe(false);
    }
  });
});
