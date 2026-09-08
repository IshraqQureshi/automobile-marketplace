import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide default social preview image — every page that doesn't set its
 * own `openGraph.images` (i.e. everything except the vehicle detail page,
 * which uses the vehicle's own real photo) falls back to this. Generated
 * rather than a static asset so it always matches the real brand tokens in
 * globals.css instead of drifting from a hand-exported PNG.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1117 0%, #005f5a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 96, fontWeight: 700 }}>
          <span style={{ color: "#ffffff" }}>Haraka</span>
          <span style={{ color: "#f5a623" }}>Gari</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 34, color: "rgba(255,255,255,0.75)", letterSpacing: 2 }}>
          KENYA&apos;S PREMIUM CAR MARKETPLACE
        </div>
        <div style={{ marginTop: 36, display: "flex", gap: 16, fontSize: 22, color: "rgba(255,255,255,0.6)" }}>
          <span>Verified Dealers</span>
          <span>•</span>
          <span>Bank Finance</span>
          <span>•</span>
          <span>Secure Transactions</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
