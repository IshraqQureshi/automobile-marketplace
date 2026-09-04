import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createAnonClient, createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

/**
 * RLS authorization integration tests for the vehicle catalog tables
 * (brands/models/vehicle_types). Requires a running local Supabase instance
 * with all migrations applied. Uses real signed-in sessions (customer, admin)
 * plus an anon client — not the admin client — to prove RLS actually
 * enforces these boundaries, not just that the application code happens to.
 *
 * Never run against a production project — this creates and deletes real
 * auth users and catalog rows.
 */
describe("Catalog RLS authorization (integration)", () => {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const testId = Date.now();

  let customer: TestUser;
  let adminUser: TestUser;
  let brandId: string;

  beforeAll(async () => {
    customer = await createTestUser();
    adminUser = await createTestUser("ADMIN");

    const { data: brand, error: brandErr } = await admin
      .from("brands")
      .insert({ name: `Test Brand ${testId}` })
      .select()
      .single();
    if (brandErr || !brand) throw brandErr ?? new Error("seed brand not created");
    brandId = brand.id;
  });

  afterAll(async () => {
    // Cascades to any models created under this brand during the tests.
    await admin.from("brands").delete().eq("id", brandId);
    await admin.from("vehicle_types").delete().ilike("name", `Test Type ${testId}%`);
    await deleteTestUser(customer.id);
    await deleteTestUser(adminUser.id);
  });

  describe("select — public reference data", () => {
    it("anon can read brands", async () => {
      const { data, error } = await anon.from("brands").select().eq("id", brandId).single();
      expect(error).toBeNull();
      expect(data?.name).toBe(`Test Brand ${testId}`);
    });

    it("anon can read vehicle_types", async () => {
      const { data, error } = await anon.from("vehicle_types").select();
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it("a signed-in customer can read models", async () => {
      const { error } = await customer.client.from("models").select();
      expect(error).toBeNull();
    });
  });

  describe("write — admin only", () => {
    it("a customer cannot insert a brand", async () => {
      const { error } = await customer.client.from("brands").insert({ name: `Customer Brand ${testId}` });
      expect(error).not.toBeNull();
    });

    it("a customer cannot update a brand", async () => {
      const { data, error } = await customer.client
        .from("brands")
        .update({ name: "Hijacked" })
        .eq("id", brandId)
        .select();
      // RLS's USING clause filters which rows are visible to update, rather
      // than raising an error — a non-matching update just affects 0 rows.
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: unchanged } = await admin.from("brands").select("name").eq("id", brandId).single();
      expect(unchanged?.name).toBe(`Test Brand ${testId}`);
    });

    it("a customer cannot delete a brand", async () => {
      const { data, error } = await customer.client.from("brands").delete().eq("id", brandId).select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await admin.from("brands").select("id").eq("id", brandId).single();
      expect(stillThere?.id).toBe(brandId);
    });

    it("a customer cannot insert a vehicle type", async () => {
      const { error } = await customer.client.from("vehicle_types").insert({ name: `Customer Type ${testId}` });
      expect(error).not.toBeNull();
    });

    it("an admin can create, update, and delete a brand", async () => {
      const { data: created, error: createErr } = await adminUser.client
        .from("brands")
        .insert({ name: `Admin Brand ${testId}` })
        .select()
        .single();
      expect(createErr).toBeNull();
      expect(created?.name).toBe(`Admin Brand ${testId}`);

      const { error: updateErr } = await adminUser.client
        .from("brands")
        .update({ name: `Admin Brand Renamed ${testId}` })
        .eq("id", created!.id);
      expect(updateErr).toBeNull();

      const { error: deleteErr } = await adminUser.client.from("brands").delete().eq("id", created!.id);
      expect(deleteErr).toBeNull();

      const { data: gone } = await admin.from("brands").select().eq("id", created!.id).maybeSingle();
      expect(gone).toBeNull();
    });

    it("an admin can create a model under a brand, and a customer cannot", async () => {
      const { data: model, error: adminErr } = await adminUser.client
        .from("models")
        .insert({ brand_id: brandId, name: `Admin Model ${testId}` })
        .select()
        .single();
      expect(adminErr).toBeNull();
      expect(model?.brand_id).toBe(brandId);

      const { error: customerErr } = await customer.client
        .from("models")
        .insert({ brand_id: brandId, name: `Customer Model ${testId}` });
      expect(customerErr).not.toBeNull();

      await admin.from("models").delete().eq("id", model!.id);
    });

    it("an admin can create a vehicle type", async () => {
      const { data, error } = await adminUser.client
        .from("vehicle_types")
        .insert({ name: `Test Type ${testId}` })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data?.name).toBe(`Test Type ${testId}`);
    });
  });

  describe("data integrity", () => {
    it("deleting a brand cascades to its models", async () => {
      const { data: brand } = await admin.from("brands").insert({ name: `Cascade Brand ${testId}` }).select().single();
      const { data: model } = await admin
        .from("models")
        .insert({ brand_id: brand!.id, name: `Cascade Model ${testId}` })
        .select()
        .single();

      await admin.from("brands").delete().eq("id", brand!.id);

      const { data: modelAfter } = await admin.from("models").select().eq("id", model!.id).maybeSingle();
      expect(modelAfter).toBeNull();
    });

    it("rejects a duplicate brand name", async () => {
      const { error } = await admin.from("brands").insert({ name: `Test Brand ${testId}` });
      expect(error).not.toBeNull();
    });

    it("rejects a blank brand name", async () => {
      const { error } = await admin.from("brands").insert({ name: "   " });
      expect(error).not.toBeNull();
    });

    it("allows the same model name under two different brands", async () => {
      const { data: brandTwo } = await admin.from("brands").insert({ name: `Second Brand ${testId}` }).select().single();

      const { error: firstErr } = await admin.from("models").insert({ brand_id: brandId, name: "Shared Name" });
      const { error: secondErr } = await admin.from("models").insert({ brand_id: brandTwo!.id, name: "Shared Name" });
      expect(firstErr).toBeNull();
      expect(secondErr).toBeNull();

      await admin.from("brands").delete().eq("id", brandTwo!.id);
    });
  });
});
