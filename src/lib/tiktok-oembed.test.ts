import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTikTokOEmbed } from "./tiktok-oembed";

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
    expect(await fetchTikTokOEmbed("https://www.tiktok.com/@showroom/video/123")).toEqual({ title: "TikTok video", thumbnailUrl: null });
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
