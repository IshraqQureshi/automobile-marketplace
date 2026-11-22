import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTikTokCoverUrl, fetchTikTokOEmbed } from "./tiktok-oembed";

describe("fetchTikTokOEmbed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the real title/thumbnail from a valid oEmbed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ title: "A real TikTok video title", thumbnail_url: "https://p16.tiktokcdn.com/thumb.jpg" }),
      }),
    );

    const result = await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123");
    expect(result).toEqual({ title: "A real TikTok video title", thumbnailUrl: "https://p16.tiktokcdn.com/thumb.jpg" });
  });

  it("requests the real url via the oembed endpoint, properly encoded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ title: "t", thumbnail_url: "https://x.com/t.jpg" }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123");
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40showroom%2Fvideo%2F123",
    );
  });

  it("still resolves a valid video when TikTok omits the title and thumbnail (current oEmbed behaviour)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: "video", html: "<iframe src='https://www.tiktok.com/player/v1/123'></iframe>" }) }),
    );
    // The cover-image fallback (a 2nd fetch of the video page) also fails here.
    expect(await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123")).toEqual({ title: "TikTok video", thumbnailUrl: null });
  });

  it("falls back to the cover image from the video page when oEmbed has no thumbnail", async () => {
    const cover = "https:\\u002F\\u002Fp19-common-sign.tiktokcdn.com\\u002Fx.image?x-expires=1";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ type: "video", html: "<iframe></iframe>" }) })
        .mockResolvedValueOnce({ ok: true, text: async () => `{"cover":"${cover}"}` }),
    );
    const result = await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123");
    expect(result?.thumbnailUrl).toBe("https://p19-common-sign.tiktokcdn.com/x.image?x-expires=1");
  });

  it("returns null (not a guess) when the video doesn't exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    expect(await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/999")).toBeNull();
  });

  it("returns null when the fetch fails outright", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    expect(await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123")).toBeNull();
  });

  it("returns null when the response shape is unexpected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: "Something went wrong", code: 400 }) }));
    expect(await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123")).toBeNull();
  });
});

describe("fetchTikTokCoverUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only accepts images served from TikTok's own CDN", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => '{"cover":"https://evil.example.com/x.jpg"}' }));
    expect(await fetchTikTokCoverUrl("https://www.tiktok.com/@a/video/1")).toBeNull();
  });

  it("returns null when the page has no cover or the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "<html></html>" }));
    expect(await fetchTikTokCoverUrl("https://www.tiktok.com/@a/video/1")).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    expect(await fetchTikTokCoverUrl("https://www.tiktok.com/@a/video/1")).toBeNull();
  });
});
