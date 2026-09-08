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
    ],
  };
}
