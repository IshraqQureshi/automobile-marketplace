import { ImageResponse } from "next/og";

// 512×512 — the other size Chrome/Android's installability criteria look
// for (used for the splash screen once installed). See pwa-icon-192's own
// note for the full context.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#007f77",
          color: "white",
          fontSize: 280,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        H
      </div>
    ),
    { width: 512, height: 512 },
  );
}
