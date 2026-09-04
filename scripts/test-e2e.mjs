#!/usr/bin/env node
// Runs the E2E suite against the local Mailpit mailer, not Mailtrap.
//
// supabase/config.toml's [auth.email.smtp] block is configured for
// Mailtrap so a developer can see real-looking auth emails while manually
// clicking through the app (see MVP_PROGRESS.md). But e2e/auth.spec.ts
// fetches confirmation/reset links from the local Mailpit instance
// (http://127.0.0.1:54324) — Mailpit only receives mail when GoTrue's
// external SMTP is disabled. So this script:
//   1. Temporarily flips auth.email.smtp.enabled to false
//   2. Restarts the local Supabase stack (config.toml is read at startup)
//   3. Runs the real Playwright suite
//   4. Restores the original config and restarts Supabase again — always,
//      even if the tests fail — so a developer's next `npm run dev`
//      session still has Mailtrap for manual testing.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CONFIG_PATH = "supabase/config.toml";
// Bounded to the [auth.email.smtp] section only — the lookahead stops the
// match from crossing into the next [section] header, so a missing/renamed
// `enabled` line inside this block throws instead of silently toggling an
// unrelated section's `enabled` flag.
const SMTP_SECTION = /(\[auth\.email\.smtp\]\s*\n(?:(?!\[)[^\n]*\n)*?enabled = )(true|false)/;

function readSmtpEnabled(content) {
  const match = content.match(SMTP_SECTION);
  if (!match) throw new Error("Could not find [auth.email.smtp] enabled flag in config.toml");
  return match[2] === "true";
}

function setSmtpEnabled(content, enabled) {
  return content.replace(SMTP_SECTION, `$1${enabled}`);
}

function restartSupabase() {
  execFileSync("npx", ["supabase", "stop"], { stdio: "inherit" });
  execFileSync("npx", ["supabase", "start"], { stdio: "inherit" });
}

const originalConfig = readFileSync(CONFIG_PATH, "utf8");
const wasEnabled = readSmtpEnabled(originalConfig);

let exitCode = 1;
try {
  if (wasEnabled) {
    console.log("Disabling SMTP (Mailtrap) for this run — E2E tests read confirmation/reset links from Mailpit.");
    writeFileSync(CONFIG_PATH, setSmtpEnabled(originalConfig, false));
    restartSupabase();
  }

  const result = spawnSync("npx", ["playwright", "test"], { stdio: "inherit" });
  exitCode = result.status ?? 1;
} finally {
  if (wasEnabled) {
    console.log("Restoring SMTP (Mailtrap) config for manual dev use.");
    writeFileSync(CONFIG_PATH, originalConfig);
    restartSupabase();
  }
}

process.exit(exitCode);
