import { describe, expect, it } from "vitest";
import { getTikTokEmbedUrl, getYouTubeEmbedUrl } from "./video-embed";

describe("getYouTubeEmbedUrl", () => {
  it("extracts the ID from a watch URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    );
  });

  it("extracts the ID from a watch URL with extra query params", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxyz")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    );
  });

  it("extracts the ID from a youtu.be short URL", () => {
    expect(getYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
  });

  it("extracts the ID from a shorts URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    );
  });

  it("extracts the ID from an already-embed URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    );
  });

  it("returns null for a non-YouTube URL", () => {
    expect(getYouTubeEmbedUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for a watch URL missing the v param", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getYouTubeEmbedUrl("not a url")).toBeNull();
  });
});

describe("getTikTokEmbedUrl", () => {
  it("extracts the numeric ID from a full video URL", () => {
    expect(getTikTokEmbedUrl("https://www.tiktok.com/@harakagari/video/7123456789012345678")).toBe(
      "https://www.tiktok.com/embed/v2/7123456789012345678",
    );
  });

  it("returns null for a short/shared link with no resolvable ID", () => {
    expect(getTikTokEmbedUrl("https://vm.tiktok.com/ZMabcdefg/")).toBeNull();
  });

  it("returns null for a non-TikTok URL", () => {
    expect(getTikTokEmbedUrl("https://example.com/@harakagari/video/7123456789012345678")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getTikTokEmbedUrl("not a url")).toBeNull();
  });
});
