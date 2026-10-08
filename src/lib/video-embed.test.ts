import { describe, expect, it } from "vitest";
import { getTikTokEmbedUrl, getYouTubeEmbedUrl, getYouTubePlaylistEmbedUrl, getYouTubeThumbnailUrl, getYouTubeVideoId } from "./video-embed";

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

  it("disables autoplay when explicitly requested — for an embed that renders on page load, not behind a click", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { autoplay: false })).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0",
    );
  });

  it("returns null for a watch URL missing the v param", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getYouTubeEmbedUrl("not a url")).toBeNull();
  });
});

describe("getYouTubeVideoId", () => {
  it("extracts the ID from a watch URL", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(getYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getYouTubeVideoId("not a url")).toBeNull();
  });
});

describe("getYouTubeThumbnailUrl", () => {
  it("derives YouTube's own static thumbnail URL for a watch URL", () => {
    expect(getYouTubeThumbnailUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("derives it from a youtu.be short URL", () => {
    expect(getYouTubeThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(getYouTubeThumbnailUrl("https://vimeo.com/12345")).toBeNull();
  });
});

describe("getYouTubePlaylistEmbedUrl", () => {
  it("extracts the list id from a playlist page URL", () => {
    expect(getYouTubePlaylistEmbedUrl("https://www.youtube.com/playlist?list=PL1234567890abcdefghij")).toBe(
      "https://www.youtube.com/embed/videoseries?list=PL1234567890abcdefghij",
    );
  });

  it("extracts the list id from a watch URL that's within a playlist", () => {
    expect(getYouTubePlaylistEmbedUrl("https://www.youtube.com/watch?v=abc123&list=PL1234567890abcdefghij")).toBe(
      "https://www.youtube.com/embed/videoseries?list=PL1234567890abcdefghij",
    );
  });

  it("returns null when there's no list param", () => {
    expect(getYouTubePlaylistEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBeNull();
  });

  it("returns null for a non-YouTube URL", () => {
    expect(getYouTubePlaylistEmbedUrl("https://example.com/playlist?list=PL1234567890abcdefghij")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getYouTubePlaylistEmbedUrl("not a url")).toBeNull();
  });

  // Regression: a real production showroom's playlist rendered as "just one
  // video" rather than a full playlist — confirmed via YouTube's own oembed
  // API that a 13-character list id like this resolves to a single
  // unrelated video, not a real playlist (real ones are 34 characters).
  // Rejecting an obviously-too-short id here means the component falls
  // back to showing nothing rather than silently embedding the wrong thing.
  it("returns null for an implausibly short (truncated/malformed) list id", () => {
    expect(getYouTubePlaylistEmbedUrl("https://www.youtube.com/playlist?list=PLZmdSdGDFTH4")).toBeNull();
  });

  // Regression: a youtu.be share link carrying a real list= param (the form
  // YouTube itself generates when sharing a video from within a playlist)
  // was rejected outright because the hostname check only matched
  // "youtube.com" — even though it satisfies the field's own stated rule
  // ("must include a list= parameter").
  it("extracts the list id from a youtu.be link that carries a list param", () => {
    expect(getYouTubePlaylistEmbedUrl("https://youtu.be/abc123?list=PL1234567890abcdefghij")).toBe(
      "https://www.youtube.com/embed/videoseries?list=PL1234567890abcdefghij",
    );
  });

  it("returns null for a youtu.be link with no list param", () => {
    expect(getYouTubePlaylistEmbedUrl("https://youtu.be/abc123")).toBeNull();
  });

  // Regression: hostname.endsWith("youtube.com") also matches a spoofed
  // domain like "fake-youtube.com", since that string literally ends with
  // "youtube.com". The embed src itself was never attacker-controlled (it's
  // rebuilt from a validated list id), but the validator shouldn't accept a
  // URL that isn't actually hosted on youtube.com.
  it("returns null for a domain that merely ends with 'youtube.com'", () => {
    expect(getYouTubePlaylistEmbedUrl("https://fake-youtube.com/playlist?list=PL1234567890abcdefghij")).toBeNull();
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
