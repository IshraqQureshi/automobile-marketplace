import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

/**
 * Integration tests for behavior specific to this PR (showroom
 * registration): the "one active showroom per owner"
 * showrooms_owner_user_id_active_unique partial unique index. Broader
 * showrooms/showroom_documents RLS boundaries (owner visibility,
 * self-approval blocking, document visibility) are already covered by
 * rls.integration.test.ts and storage-rls.integration.test.ts — not
 * duplicated here.
 */
describe("Showroom registration — one active showroom per owner (integration)", () => {
  const admin = createAdminClient();
  const testId = Date.now();

  let owner: TestUser;

  beforeAll(async () => {
    owner = await createTestUser();
  });

  afterAll(async () => {
    await admin.from("showrooms").delete().eq("owner_user_id", owner.id);
    await deleteTestUser(owner.id);
  });

  it("an owner can register their first showroom", async () => {
    const { data, error } = await owner.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `First Showroom ${testId}`,
        phone: "+254712345678",
        email: `showroom-${testId}@example.com`,
        city: "Westlands, Nairobi",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("PENDING");
    expect(data?.verified).toBe(false);
  });

  it("a second registration attempt while the first is still PENDING is rejected", async () => {
    const { error } = await owner.client.from("showrooms").insert({
      owner_user_id: owner.id,
      business_name: `Second Showroom ${testId}`,
      phone: "+254712345678",
      email: `showroom-2-${testId}@example.com`,
      city: "Westlands, Nairobi",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23505");
  });

  it("after the first showroom is rejected, the owner can register again", async () => {
    const { error: rejectErr } = await admin.from("showrooms").update({ status: "REJECTED" }).eq("owner_user_id", owner.id);
    expect(rejectErr).toBeNull();

    const { data, error } = await owner.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `Retry Showroom ${testId}`,
        phone: "+254712345678",
        email: `showroom-retry-${testId}@example.com`,
        city: "Westlands, Nairobi",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("PENDING");
  });

  it("a second active registration is still rejected once the retry is also PENDING", async () => {
    const { error } = await owner.client.from("showrooms").insert({
      owner_user_id: owner.id,
      business_name: `Third Showroom ${testId}`,
      phone: "+254712345678",
      email: `showroom-3-${testId}@example.com`,
      city: "Westlands, Nairobi",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23505");
  });
});
