import { afterEach, describe, expect, it, vi } from "vitest";
import { mimeTypeFromStoragePath, probeImageDimensions } from "./og-image";

describe("mimeTypeFromStoragePath", () => {
  it("recognizes png", () => {
    expect(mimeTypeFromStoragePath("https://example.com/photo.png")).toBe("image/png");
  });

  it("recognizes webp", () => {
    expect(mimeTypeFromStoragePath("https://example.com/photo.webp")).toBe("image/webp");
  });

  it("defaults to jpeg for jpg and any other/unknown extension", () => {
    expect(mimeTypeFromStoragePath("https://example.com/photo.jpg")).toBe("image/jpeg");
    expect(mimeTypeFromStoragePath("https://example.com/photo")).toBe("image/jpeg");
  });

  it("ignores a query string when reading the extension", () => {
    expect(mimeTypeFromStoragePath("https://example.com/photo.png?token=abc")).toBe("image/png");
  });
});

describe("probeImageDimensions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // A minimal valid 2x1 PNG (smallest real image-size can parse), used to
  // prove real bytes get decoded into real dimensions rather than a guess
  // — this is the exact class of bug this module fixes: a previous version
  // hardcoded 1200x900 regardless of what the real photo's aspect ratio
  // was (live vehicle photos range from landscape 1200x799 to portrait
  // 1200x1695), which is why WhatsApp specifically kept rejecting the
  // thumbnail even once type/width/height were all present.
  const TINY_PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAAeGRPoAAAADUlEQVR4nGP4z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

  it("returns the real dimensions decoded from the fetched image bytes", async () => {
    const buffer = Uint8Array.from(Buffer.from(TINY_PNG_BASE64, "base64"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 206, arrayBuffer: async () => buffer.buffer }),
    );

    const result = await probeImageDimensions("https://example.com/photo.png");
    expect(result).toEqual({ width: 2, height: 1 });
  });

  it("requests only a partial byte range, not the whole file", async () => {
    const buffer = Uint8Array.from(Buffer.from(TINY_PNG_BASE64, "base64"));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 206, arrayBuffer: async () => buffer.buffer });
    vi.stubGlobal("fetch", fetchMock);

    await probeImageDimensions("https://example.com/photo.png");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/photo.png", { headers: { Range: "bytes=0-65535" } });
  });

  it("returns null (not a guessed value) when the fetch fails outright", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    expect(await probeImageDimensions("https://example.com/photo.png")).toBeNull();
  });

  it("returns null when the response isn't ok or partial content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await probeImageDimensions("https://example.com/photo.png")).toBeNull();
  });

  it("returns null (not a guessed value) when the bytes aren't a parseable image", async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 206, arrayBuffer: async () => garbage.buffer }));
    expect(await probeImageDimensions("https://example.com/photo.png")).toBeNull();
  });
});
