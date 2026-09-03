import { describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";

/**
 * Integration test — requires a running local Supabase instance
 * (`npx supabase start`) and a populated .env.local. Proves the service-role
 * client can actually reach Auth and Storage, not just that the code compiles.
 *
 * FND-002 scope: connectivity only. No application tables exist yet
 * (FND-003), so there is no business data to query against.
 */
describe("Supabase connectivity (integration)", () => {
  it("reaches the Auth service with the service-role client", async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers();

    expect(error).toBeNull();
    expect(Array.isArray(data.users)).toBe(true);
  });

  it("reaches the Storage service with the service-role client", async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.listBuckets();

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
