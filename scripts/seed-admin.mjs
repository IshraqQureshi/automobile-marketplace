#!/usr/bin/env node
// Bootstraps (or promotes) an ADMIN user for local development.
//
// Per DATABASE_MIGRATION_PLAN.md §43: the database migrations must NOT
// create an admin account with a hardcoded password — admin creation must
// go through a trusted, controlled process. This script is that process:
//   1. Creates the auth user via the service-role admin API (never a
//      migration/seed.sql, which can't call GoTrue anyway).
//   2. Promotes their profile to ADMIN via the service-role client, which
//      bypasses both RLS and the self-role-escalation trigger correctly
//      (auth.uid() is null for service-role — see FND-003/FND-004).
//   3. Never writes credentials to a file — prints a freshly-generated
//      password once, to the terminal only.
//
// Usage:
//   npm run seed:admin
//   ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD=... npm run seed:admin
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment (loaded from .env.local by the npm script — see package.json).

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Is .env.local populated?");
  process.exit(1);
}

const email = process.env.ADMIN_SEED_EMAIL ?? "admin@harakagari.local";
const providedPassword = process.env.ADMIN_SEED_PASSWORD;
const password = providedPassword ?? randomBytes(9).toString("base64url");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExistingUserByEmail(targetEmail) {
  // The admin API has no direct "get by email" — page through listUsers.
  // Fine for local dev's small user count; not something this script needs
  // to scale, since it only ever runs against a local/dev instance.
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email === targetEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  let userId;
  let isNewUser = false;

  const existing = await findExistingUserByEmail(email);

  if (existing) {
    userId = existing.id;
    console.log(`User ${email} already exists (${userId}) — promoting to ADMIN.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error("Failed to create admin user:", error?.message ?? "unknown error");
      process.exit(1);
    }
    userId = data.user.id;
    isNewUser = true;
  }

  const { error: promoteError } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (promoteError) {
    console.error("User created but failed to promote to ADMIN:", promoteError.message);
    process.exit(1);
  }

  console.log("\n✅ Admin ready.");
  console.log(`   Email: ${email}`);
  if (isNewUser && !providedPassword) {
    console.log(`   Password (generated, shown once): ${password}`);
  } else if (isNewUser) {
    console.log("   Password: the one you supplied via ADMIN_SEED_PASSWORD.");
  } else {
    console.log("   (Existing account — password unchanged.)");
  }
  console.log("\nThis is local-dev bootstrapping only. Never run with a hardcoded/committed");
  console.log("password against a staging or production project.\n");
}

main();
