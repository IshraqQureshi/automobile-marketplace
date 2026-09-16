import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HarakaGari — Kenya's Premium Car Marketplace",
    short_name: "HarakaGari",
    description: "Kenya's premium automobile marketplace — verified showrooms, bank finance, and HP installments.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007f77",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      // 192/512 are what Chrome/Android's installability criteria actually
      // look for — the browser-tab favicon and Apple touch icon above
      // aren't big enough for a real "Add to Home Screen" app icon.
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
