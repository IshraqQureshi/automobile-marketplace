import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYouTubePlaylistVideos } from "./youtube-playlist";

function snippet(overrides: Record<string, unknown> = {}) {
  return {
    title: "A real showroom video",
    resourceId: { videoId: "abc123" },
    thumbnails: { medium: { url: "https://i.ytimg.com/vi/abc123/mqdefault.jpg" } },
    ...overrides,
  };
}

describe("fetchYouTubePlaylistVideos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns [] without calling the network when YOUTUBE_API_KEY is unset", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchYouTubePlaylistVideos("PLsome")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns every real video, shaped from the API's snippet", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            snippet({ resourceId: { videoId: "vid1" }, title: "First video" }),
            snippet({ resourceId: { videoId: "vid2" }, title: "Second video", thumbnails: { high: { url: "https://i.ytimg.com/vi/vid2/hq.jpg" } } }),
          ].map((s) => ({ snippet: s })),
        }),
      }),
    );

    const result = await fetchYouTubePlaylistVideos("PLreal");
    expect(result).toEqual([
      { id: "vid1", title: "First video", thumbnailUrl: "https://i.ytimg.com/vi/abc123/mqdefault.jpg" },
      { id: "vid2", title: "Second video", thumbnailUrl: "https://i.ytimg.com/vi/vid2/hq.jpg" },
    ]);
  });

  it("requests the real playlist id and key, properly encoded", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "my key/with special chars");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchYouTubePlaylistVideos("PL with spaces");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("playlistId=PL%20with%20spaces");
    expect(url).toContain("key=my%20key%2Fwith%20special%20chars");
  });

  // Regression: a video the admin removed, made private, or that YouTube
  // took down still appears as a playlistItem (not omitted), but with a
  // sentinel title and no real thumbnail — must be skipped, not rendered
  // as a broken card.
  it("drops private and deleted videos, keeping the rest", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            { snippet: snippet({ title: "Private video", thumbnails: {} }) },
            { snippet: snippet({ title: "Deleted video", thumbnails: {} }) },
            { snippet: snippet({ resourceId: { videoId: "survivor" }, title: "A real video" }) },
          ],
        }),
      }),
    );

    expect(await fetchYouTubePlaylistVideos("PLreal")).toEqual([
      { id: "survivor", title: "A real video", thumbnailUrl: "https://i.ytimg.com/vi/abc123/mqdefault.jpg" },
    ]);
  });

  it("returns [] when the playlist doesn't exist (API responds with an error status)", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchYouTubePlaylistVideos("PLdoesnotexist")).toEqual([]);
  });

  it("returns [] when the fetch fails outright", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    expect(await fetchYouTubePlaylistVideos("PLreal")).toEqual([]);
  });

  it("returns [] when the response shape is unexpected", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: "quota exceeded" }) }));
    expect(await fetchYouTubePlaylistVideos("PLreal")).toEqual([]);
  });
});
