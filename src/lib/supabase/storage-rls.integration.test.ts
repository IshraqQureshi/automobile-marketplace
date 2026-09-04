import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createAnonClient, createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

/**
 * Storage RLS integration tests (FND-004). Requires a running local
 * Supabase instance with the vehicle-media/showroom-documents buckets and
 * their policies applied.
 */
describe("Storage RLS authorization (integration)", () => {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const testId = Date.now();

  let ownerA: TestUser;
  let ownerB: TestUser;
  let showroomAId: string;
  let showroomBId: string;
  let adminUser: TestUser;
  let brandId: string;

  const tinyFile = new Blob(["not a real image, just proving RLS"], { type: "image/jpeg" });
  const tinyDoc = new Blob(["not a real pdf, just proving RLS"], { type: "application/pdf" });
  const tinyLogo = new Blob(["not a real logo, just proving RLS"], { type: "image/png" });

  beforeAll(async () => {
    ownerA = await createTestUser();
    ownerB = await createTestUser();
    adminUser = await createTestUser("ADMIN");

    const { data: brand, error: brandErr } = await admin.from("brands").insert({ name: `Storage Test Brand ${testId}` }).select().single();
    if (brandErr || !brand) throw brandErr ?? new Error("brand not created");
    brandId = brand.id;

    const { data: showroomA, error: aErr } = await ownerA.client
      .from("showrooms")
      .insert({ owner_user_id: ownerA.id, business_name: `Storage Test A ${testId}`, phone: "0700000000", email: `sa-${testId}@example.com` })
      .select()
      .single();
    if (aErr || !showroomA) throw aErr ?? new Error("showroom A not created");
    showroomAId = showroomA.id;

    const { data: showroomB, error: bErr } = await ownerB.client
      .from("showrooms")
      .insert({ owner_user_id: ownerB.id, business_name: `Storage Test B ${testId}`, phone: "0700000001", email: `sb-${testId}@example.com` })
      .select()
      .single();
    if (bErr || !showroomB) throw bErr ?? new Error("showroom B not created");
    showroomBId = showroomB.id;
  });

  afterAll(async () => {
    await admin.storage.from("vehicle-media").remove([`${showroomAId}/test.jpg`, `${showroomBId}/test.jpg`]);
    await admin.storage.from("showroom-documents").remove([`${showroomAId}/doc.pdf`, `${showroomBId}/doc.pdf`]);
    await admin.storage.from("brand-logos").remove([`${brandId}/logo.png`, `${brandId}/hijacked.png`]);
    if (showroomAId) await admin.from("showrooms").delete().eq("id", showroomAId);
    if (showroomBId) await admin.from("showrooms").delete().eq("id", showroomBId);
    if (brandId) await admin.from("brands").delete().eq("id", brandId);
    for (const u of [ownerA, ownerB, adminUser]) if (u?.id) await deleteTestUser(u.id);
  });

  describe("vehicle-media (public bucket)", () => {
    it("the owning showroom can upload into its own folder", async () => {
      const { error } = await ownerA.client.storage.from("vehicle-media").upload(`${showroomAId}/test.jpg`, tinyFile, { upsert: true });
      expect(error).toBeNull();
    });

    it("a different showroom cannot upload into another showroom's folder", async () => {
      const { error } = await ownerB.client.storage.from("vehicle-media").upload(`${showroomAId}/hijacked.jpg`, tinyFile);
      expect(error).not.toBeNull();
    });

    it("anon can read from the public bucket", async () => {
      const { data, error } = await anon.storage.from("vehicle-media").list(showroomAId);
      expect(error).toBeNull();
      expect(data?.some((f) => f.name === "test.jpg")).toBe(true);
    });

    it("a different showroom cannot delete another showroom's file", async () => {
      const { error } = await ownerB.client.storage.from("vehicle-media").remove([`${showroomAId}/test.jpg`]);
      // Supabase Storage reports an unauthorized removal as a successful
      // call with an empty result, not a thrown error — assert on the
      // effect (file still exists), not just the error field.
      expect(error).toBeNull();

      const { data } = await admin.storage.from("vehicle-media").list(showroomAId);
      expect(data?.some((f) => f.name === "test.jpg")).toBe(true);
    });
  });

  describe("showroom-documents (private bucket)", () => {
    it("the owning showroom can upload its own document", async () => {
      const { error } = await ownerA.client.storage.from("showroom-documents").upload(`${showroomAId}/doc.pdf`, tinyDoc, { upsert: true });
      expect(error).toBeNull();
    });

    it("a different showroom cannot read another showroom's document", async () => {
      const { data, error } = await ownerB.client.storage.from("showroom-documents").list(showroomAId);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });

    it("anon cannot read any showroom document", async () => {
      const { data, error } = await anon.storage.from("showroom-documents").list(showroomAId);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });

    it("admin can read any showroom's documents", async () => {
      const { data, error } = await admin.storage.from("showroom-documents").list(showroomAId);
      expect(error).toBeNull();
      expect(data?.some((f) => f.name === "doc.pdf")).toBe(true);
    });
  });

  describe("brand-logos (public bucket, admin-only write)", () => {
    it("a non-admin customer cannot upload a brand logo", async () => {
      const { error } = await ownerA.client.storage.from("brand-logos").upload(`${brandId}/hijacked.png`, tinyLogo);
      expect(error).not.toBeNull();
    });

    it("an admin can upload a brand logo", async () => {
      const { error } = await adminUser.client.storage.from("brand-logos").upload(`${brandId}/logo.png`, tinyLogo, { upsert: true });
      expect(error).toBeNull();
    });

    it("anon can read from the public bucket", async () => {
      const { data, error } = await anon.storage.from("brand-logos").list(brandId);
      expect(error).toBeNull();
      expect(data?.some((f) => f.name === "logo.png")).toBe(true);
    });

    it("a non-admin customer cannot delete a brand logo", async () => {
      const { error } = await ownerA.client.storage.from("brand-logos").remove([`${brandId}/logo.png`]);
      // Same Supabase Storage behavior as vehicle-media above: an
      // unauthorized removal reports success with an empty result.
      expect(error).toBeNull();

      const { data } = await admin.storage.from("brand-logos").list(brandId);
      expect(data?.some((f) => f.name === "logo.png")).toBe(true);
    });

    it("an admin can delete a brand logo", async () => {
      const { error } = await adminUser.client.storage.from("brand-logos").remove([`${brandId}/logo.png`]);
      expect(error).toBeNull();

      const { data } = await admin.storage.from("brand-logos").list(brandId);
      expect(data?.some((f) => f.name === "logo.png")).toBe(false);
    });
  });
});
