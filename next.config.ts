import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The project's real engineering constitution lives at .claude/CLAUDE.md —
  // disable Next.js's auto-generated root AGENTS.md/CLAUDE.md so it doesn't
  // create a second, conflicting source of truth.
  agentRules: false,
  experimental: {
    serverActions: {
      // Every file-upload Server Action (vehicle photos, showroom
      // documents, brand/showroom logos) posts multipart FormData directly
      // to a Server Action, which Next.js caps at 1MB by default —
      // comfortably under the vehicle-media bucket's own 10MB-per-file
      // limit even for a single photo, and immediately blown past by
      // selecting more than one. 20MB covers a same real single upload
      // batch (a handful of photos) while staying well under any bucket's
      // own per-file cap, which is still enforced separately server-side.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
