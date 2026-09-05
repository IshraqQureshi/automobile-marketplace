import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

/**
 * Integration tests for the admin showroom CRUD feature's RLS boundary:
 * admin-created showrooms (showrooms_insert_admin — see
 * supabase/migrations/20260905040000_add_showroom_admin_insert_policy.sql),
 * admin edits to business details, and admin delete. Approve/reject and
 * signed-URL access are already covered by showroom-approval.integration.test.ts
 * — not duplicated here. Ordinary owner self-registration RLS is covered by
 * rls.integration.test.ts.
 */
describe("Admin showroom CRUD (integration)", () => {
  const admin = createAdminClient();
  const testId = Date.now();

  let owner: TestUser;
  let otherCustomer: TestUser;
  let adminUser: TestUser;
  const createdShowroomIds: string[] = [];

  beforeAll(async () => {
    owner = await createTestUser();
    otherCustomer = await createTestUser();
    adminUser = await createTestUser("ADMIN");
  });

  afterEach(async () => {
    if (createdShowroomIds.length > 0) {
      await admin.from("showrooms").delete().in("id", createdShowroomIds);
      createdShowroomIds.length = 0;
    }
  });

  afterAll(async () => {
    for (const u of [owner, otherCustomer, adminUser]) if (u?.id) await deleteTestUser(u.id);
  });

  it("an admin can create a showroom on behalf of another user", async () => {
    const { data, error } = await adminUser.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `Admin Created Showroom ${testId}`,
        phone: "+254712345678",
        email: `admin-created-${testId}@example.com`,
        city: "Nairobi",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.owner_user_id).toBe(owner.id);
    if (data) createdShowroomIds.push(data.id);
  });

  it("a non-admin cannot create a showroom on behalf of another user", async () => {
    const { data, error } = await otherCustomer.client.from("showrooms").insert({
      owner_user_id: owner.id,
      business_name: `Should Not Exist ${testId}`,
      phone: "+254712345678",
      email: `should-not-exist-${testId}@example.com`,
      city: "Nairobi",
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("an admin cannot create a second active showroom for a user who already has one", async () => {
    const { data: first, error: firstError } = await adminUser.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `First Active Showroom ${testId}`,
        phone: "+254712345678",
        email: `first-active-${testId}@example.com`,
        city: "Nairobi",
      })
      .select()
      .single();
    expect(firstError).toBeNull();
    if (first) createdShowroomIds.push(first.id);

    const { data: second, error: secondError } = await adminUser.client.from("showrooms").insert({
      owner_user_id: owner.id,
      business_name: `Second Active Showroom ${testId}`,
      phone: "+254712345678",
      email: `second-active-${testId}@example.com`,
      city: "Nairobi",
    });
    expect(second).toBeNull();
    expect(secondError?.code).toBe("23505");
  });

  it("an admin can edit a showroom's business details", async () => {
    const { data: showroom } = await adminUser.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `Editable Showroom ${testId}`,
        phone: "+254712345678",
        email: `editable-${testId}@example.com`,
        city: "Nairobi",
      })
      .select()
      .single();
    if (!showroom) throw new Error("showroom not created");
    createdShowroomIds.push(showroom.id);

    const { data, error } = await adminUser.client
      .from("showrooms")
      .update({ business_name: "Renamed by Admin", city: "Mombasa" })
      .eq("id", showroom.id)
      .select();
    expect(error).toBeNull();
    expect(data?.[0]?.business_name).toBe("Renamed by Admin");
    expect(data?.[0]?.city).toBe("Mombasa");
  });

  it("an admin can delete a showroom", async () => {
    const { data: showroom } = await adminUser.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `Deletable Showroom ${testId}`,
        phone: "+254712345678",
        email: `deletable-${testId}@example.com`,
        city: "Nairobi",
      })
      .select()
      .single();
    if (!showroom) throw new Error("showroom not created");

    const { data, error } = await adminUser.client.from("showrooms").delete().eq("id", showroom.id).select();
    expect(error).toBeNull();
    expect(data?.length).toBe(1);

    const { data: verify } = await admin.from("showrooms").select("id").eq("id", showroom.id).maybeSingle();
    expect(verify).toBeNull();
  });

  it("a non-admin, non-owner customer cannot delete someone else's showroom", async () => {
    const { data: showroom } = await adminUser.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `Protected Showroom ${testId}`,
        phone: "+254712345678",
        email: `protected-${testId}@example.com`,
        city: "Nairobi",
      })
      .select()
      .single();
    if (!showroom) throw new Error("showroom not created");
    createdShowroomIds.push(showroom.id);

    const { data, error } = await otherCustomer.client.from("showrooms").delete().eq("id", showroom.id).select();
    expect(error).toBeNull();
    expect(data?.length).toBe(0);

    const { data: verify } = await admin.from("showrooms").select("id").eq("id", showroom.id).maybeSingle();
    expect(verify).not.toBeNull();
  });
});
