import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The project's real engineering constitution lives at .claude/CLAUDE.md —
  // disable Next.js's auto-generated root AGENTS.md/CLAUDE.md so it doesn't
  // create a second, conflicting source of truth.
  agentRules: false,
};

export default nextConfig;
