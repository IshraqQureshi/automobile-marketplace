import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Dynamic favicon (no static icon.png/ico ever existed) — a simple "H"
 * mark in the real brand color, matching the initials-avatar convention
 * already used throughout the admin/dashboard sidebars, rather than
 * cropping the wide wordmark logo (1462×376, wrong aspect ratio for a
 * square favicon) down to something illegible at 32×32.
 */
export default function Icon() {
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
          borderRadius: 6,
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
