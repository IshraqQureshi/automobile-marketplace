import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads a single STRING-typed system_settings value, keyed by its `key`
 * column. Returns "" if the key doesn't exist or isn't a string — callers
 * treat that identically to "not configured yet" rather than as an error,
 * since these are optional homepage settings an admin may not have filled
 * in yet.
 */
export async function getSystemSettingString(supabase: SupabaseServerClient, key: string): Promise<string> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
  return typeof data?.value === "string" ? data.value : "";
}
