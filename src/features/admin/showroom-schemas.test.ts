import { describe, expect, it } from "vitest";
import { adminShowroomSchema, youtubePlaylistUrlSchema } from "./showroom-schemas";

const valid = {
  businessName: "AutoElite Motors",
  location: "Westlands, Nairobi",
  businessPhone: "712345678",
  businessEmail: "sales@autoelite.co.ke",
  address: "",
  description: "",
  openingHours: "",
};

describe("adminShowroomSchema — opening hours field", () => {
  it("accepts every optional field left blank", () => {
    expect(adminShowroomSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a real opening-hours display string", () => {
    const result = adminShowroomSchema.safeParse({ ...valid, openingHours: "Mon–Sat, 8am–6pm" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingHours).toBe("Mon–Sat, 8am–6pm");
  });

  it("rejects an opening-hours string over 100 characters", () => {
    expect(adminShowroomSchema.safeParse({ ...valid, openingHours: "a".repeat(101) }).success).toBe(false);
  });
});

// Deliberately its own schema, not part of adminShowroomSchema above — see
// youtubePlaylistUrlSchema's own comment (admin-only, not shared with
// updateShowroomProfile's owner-facing validation).
describe("youtubePlaylistUrlSchema", () => {
  it("accepts an empty string (not configured yet)", () => {
    expect(youtubePlaylistUrlSchema.safeParse("").success).toBe(true);
  });

  it("accepts a valid YouTube playlist URL", () => {
    const result = youtubePlaylistUrlSchema.safeParse("https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    expect(result.success).toBe(true);
  });

  it("rejects a malformed URL", () => {
    expect(youtubePlaylistUrlSchema.safeParse("not-a-url").success).toBe(false);
  });
});
