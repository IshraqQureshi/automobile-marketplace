import { ImageResponse } from "next/og";

// A real installable-app icon — the favicon (icon.tsx, 32×32) and Apple
// touch icon (apple-icon.tsx, 180×180) already existed, but the manifest
// had nothing at 192×192, which Chrome/Android's own installability
// criteria require at minimum for "Add to Home Screen" to offer a real app
// icon instead of a generic placeholder (client feedback: "Icon for PWA
// app"). Same "H" mark/brand color as the existing favicon, just at the
// size PWA install actually needs — not a separate design.
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
          fontSize: 104,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        H
      </div>
    ),
    { width: 192, height: 192 },
  );
}
