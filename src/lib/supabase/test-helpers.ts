import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Test-only helpers for exercising RLS with real signed-in sessions rather
 * than the admin (service-role) client. Not itself a test file — filename
 * deliberately doesn't match Vitest's `*.test.ts` include glob.
 */

const admin = createAdminClient();

export interface TestUser {
  id: string;
  email: string;
  client: ReturnType<typeof createSupabaseClient<Database>>;
}

/**
 * Creates a real auth user (profile is auto-created by the handle_new_user
 * trigger), optionally promotes their role via the admin client — which
 * bypasses both RLS and the self-role-escalation trigger, since auth.uid()
 * is null under a service-role JWT — then signs in and returns a client
 * scoped to their real session, subject to RLS.
 */
export async function createTestUser(role?: "SHOWROOM" | "ADMIN"): Promise<TestUser> {
  const email = `test-${role ?? "customer"}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "test-password-not-real-123";

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error("test user not created");
  const id = created.user.id;

  if (role) {
    const { error: promoteErr } = await admin.from("profiles").update({ role }).eq("id", id);
    if (promoteErr) throw promoteErr;
  }

  const client = await signInAs(email, password);
  return { id, email, client };
}

async function signInAs(email: string, password: string) {
  const anon = createAnonClient();
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) throw signInErr ?? new Error("sign-in did not return a session");

  return createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
  });
}

export function createAnonClient() {
  return createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function deleteTestUser(id: string) {
  await admin.auth.admin.deleteUser(id);
}
