import { describe, expect, it } from "vitest";
import { showroomVideoSchema } from "./video-schemas";

describe("showroomVideoSchema", () => {
  it("accepts a valid title and YouTube watch URL", () => {
    const result = showroomVideoSchema.safeParse({ title: "Showroom Tour", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    expect(result.success).toBe(true);
  });

  it("accepts a youtu.be short URL", () => {
    const result = showroomVideoSchema.safeParse({ title: "Test Drive", videoUrl: "https://youtu.be/dQw4w9WgXcQ" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank title", () => {
    expect(showroomVideoSchema.safeParse({ title: "", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }).success).toBe(false);
  });

  it("rejects a title over 100 characters", () => {
    expect(showroomVideoSchema.safeParse({ title: "a".repeat(101), videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }).success).toBe(false);
  });

  it("rejects a blank video URL", () => {
    expect(showroomVideoSchema.safeParse({ title: "Test Drive", videoUrl: "" }).success).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(showroomVideoSchema.safeParse({ title: "Test Drive", videoUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects a non-YouTube URL", () => {
    expect(showroomVideoSchema.safeParse({ title: "Test Drive", videoUrl: "https://vimeo.com/12345" }).success).toBe(false);
  });
});
