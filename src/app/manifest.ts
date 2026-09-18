import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Haraka Gari — Kenya's Premium Car Marketplace",
    // What actually shows under the home-screen icon once installed as a
    // PWA (client-reported: "when PWA app is installed on mobile its name
    // show HarakaGari just want a space") — the site's own <title>/header
    // wordmark elsewhere stays "HarakaGari" (one word), unaffected.
    short_name: "Haraka Gari",
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
