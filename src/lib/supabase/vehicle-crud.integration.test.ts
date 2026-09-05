import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createAnonClient, createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

// Requires a running local Supabase instance (npx supabase start). Verifies
// the vehicles/vehicle_media RLS policies from
// supabase/migrations/20260903203104_create_rls_policies.sql directly —
// these tables/policies already existed before this feature (Vehicle
// management, Day 2); this test is new coverage for them, not a schema
// change.
describe("Vehicle/vehicle_media RLS authorization (integration)", () => {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const testId = Date.now();

  let ownerA: TestUser;
  let ownerB: TestUser;
  let showroomA: string;
  let showroomB: string;

  beforeAll(async () => {
    ownerA = await createTestUser();
    ownerB = await createTestUser();

    const { data: sA, error: errA } = await admin
      .from("showrooms")
      .insert({
        owner_user_id: ownerA.id,
        business_name: `Test Showroom A ${testId}`,
        phone: "+254712345678",
        email: `showroom-a-${testId}@example.com`,
        status: "APPROVED",
      })
      .select("id")
      .single();
    if (errA || !sA) throw errA ?? new Error("showroom A not created");
    showroomA = sA.id;

    const { data: sB, error: errB } = await admin
      .from("showrooms")
      .insert({
        owner_user_id: ownerB.id,
        business_name: `Test Showroom B ${testId}`,
        phone: "+254712345679",
        email: `showroom-b-${testId}@example.com`,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (errB || !sB) throw errB ?? new Error("showroom B not created");
    showroomB = sB.id;
  });

  afterAll(async () => {
    await admin.from("showrooms").delete().in("id", [showroomA, showroomB]);
    await deleteTestUser(ownerA.id);
    await deleteTestUser(ownerB.id);
  });

  it("an owner can insert a vehicle for their own showroom", async () => {
    const { data, error } = await ownerA.client
      .from("vehicles")
      .insert({ showroom_id: showroomA, title: "Test Vehicle", make: "Toyota", model: "Camry", year: 2019, price: 2500000 })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    if (data) await admin.from("vehicles").delete().eq("id", data.id);
  });

  it("an owner cannot insert a vehicle for a showroom they don't own", async () => {
    const { error } = await ownerA.client
      .from("vehicles")
      .insert({ showroom_id: showroomB, title: "Test Vehicle", make: "Toyota", model: "Camry", year: 2019, price: 2500000 });
    expect(error).not.toBeNull();
  });

  describe("with an owner-A vehicle", () => {
    let vehicleId: string;

    beforeAll(async () => {
      const { data, error } = await admin
        .from("vehicles")
        .insert({ showroom_id: showroomA, title: "Owner A Vehicle", make: "Toyota", model: "Camry", year: 2019, price: 2500000, status: "DRAFT" })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("vehicle not created");
      vehicleId = data.id;
    });

    afterAll(async () => {
      await admin.from("vehicles").delete().eq("id", vehicleId);
    });

    it("owner A can update their own vehicle", async () => {
      const { data, error } = await ownerA.client.from("vehicles").update({ price: 2600000 }).eq("id", vehicleId).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("owner B cannot update owner A's vehicle (RLS silently filters, 0 rows)", async () => {
      const { data, error } = await ownerB.client.from("vehicles").update({ price: 1 }).eq("id", vehicleId).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: unchanged } = await admin.from("vehicles").select("price").eq("id", vehicleId).single();
      expect(unchanged?.price).not.toBe(1);
    });

    it("owner B cannot delete owner A's vehicle", async () => {
      const { data, error } = await ownerB.client.from("vehicles").delete().eq("id", vehicleId).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: stillExists } = await admin.from("vehicles").select("id").eq("id", vehicleId).maybeSingle();
      expect(stillExists).not.toBeNull();
    });

    it("a signed-out visitor cannot see a DRAFT vehicle", async () => {
      const { data } = await anon.from("vehicles").select("id").eq("id", vehicleId).maybeSingle();
      expect(data).toBeNull();
    });

    it("owner A can still see their own DRAFT vehicle", async () => {
      const { data } = await ownerA.client.from("vehicles").select("id").eq("id", vehicleId).maybeSingle();
      expect(data).not.toBeNull();
    });
  });

  describe("public visibility requires ACTIVE + APPROVED showroom", () => {
    let activeVehicleId: string;

    beforeAll(async () => {
      const { data, error } = await admin
        .from("vehicles")
        .insert({ showroom_id: showroomA, title: "Active Vehicle", make: "Toyota", model: "Camry", year: 2019, price: 2500000, status: "ACTIVE" })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("vehicle not created");
      activeVehicleId = data.id;
    });

    afterAll(async () => {
      await admin.from("vehicles").delete().eq("id", activeVehicleId);
    });

    it("a signed-out visitor can see an ACTIVE vehicle from an APPROVED showroom", async () => {
      const { data } = await anon.from("vehicles").select("id").eq("id", activeVehicleId).maybeSingle();
      expect(data).not.toBeNull();
    });

    it("a signed-out visitor cannot see an ACTIVE vehicle from a non-APPROVED showroom", async () => {
      const { data: vehicle, error } = await admin
        .from("vehicles")
        .insert({ showroom_id: showroomB, title: "Active but unapproved", make: "Toyota", model: "Camry", year: 2019, price: 2500000, status: "ACTIVE" })
        .select("id")
        .single();
      if (error || !vehicle) throw error ?? new Error("vehicle not created");

      const { data } = await anon.from("vehicles").select("id").eq("id", vehicle.id).maybeSingle();
      expect(data).toBeNull();

      await admin.from("vehicles").delete().eq("id", vehicle.id);
    });
  });

  describe("vehicle_media ownership", () => {
    let vehicleId: string;

    beforeAll(async () => {
      const { data, error } = await admin
        .from("vehicles")
        .insert({ showroom_id: showroomA, title: "Media Test Vehicle", make: "Toyota", model: "Camry", year: 2019, price: 2500000, status: "DRAFT" })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("vehicle not created");
      vehicleId = data.id;
    });

    afterAll(async () => {
      await admin.from("vehicles").delete().eq("id", vehicleId);
    });

    it("owner A can insert media for their own vehicle", async () => {
      const { data, error } = await ownerA.client
        .from("vehicle_media")
        .insert({ vehicle_id: vehicleId, storage_path: `${showroomA}/${vehicleId}/test.jpg` })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();

      if (data) await admin.from("vehicle_media").delete().eq("id", data.id);
    });

    it("owner B cannot insert media for owner A's vehicle", async () => {
      const { error } = await ownerB.client
        .from("vehicle_media")
        .insert({ vehicle_id: vehicleId, storage_path: `${showroomA}/${vehicleId}/test.jpg` });
      expect(error).not.toBeNull();
    });

    it("owner B cannot delete owner A's vehicle media", async () => {
      const { data: media, error: insertError } = await admin
        .from("vehicle_media")
        .insert({ vehicle_id: vehicleId, storage_path: `${showroomA}/${vehicleId}/test2.jpg` })
        .select("id")
        .single();
      if (insertError || !media) throw insertError ?? new Error("media not created");

      const { data, error } = await ownerB.client.from("vehicle_media").delete().eq("id", media.id).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      await admin.from("vehicle_media").delete().eq("id", media.id);
    });
  });
});
