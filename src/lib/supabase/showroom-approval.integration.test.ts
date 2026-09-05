import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

/**
 * Integration tests for behavior specific to the admin showroom approval
 * feature: rejecting a showroom, and generating a signed URL for a private
 * showroom document. Broader showrooms/showroom_documents row-level RLS
 * (owner visibility, self-approval blocking, admin can approve) is already
 * covered by rls.integration.test.ts — not duplicated here.
 */
describe("Showroom approval (integration)", () => {
  const admin = createAdminClient();
  const testId = Date.now();

  let owner: TestUser;
  let otherCustomer: TestUser;
  let adminUser: TestUser;
  let showroomId: string;

  const tinyDoc = new Blob(["not a real pdf, just proving RLS"], { type: "application/pdf" });

  beforeAll(async () => {
    owner = await createTestUser();
    otherCustomer = await createTestUser();
    adminUser = await createTestUser("ADMIN");

    const { data: showroom, error } = await owner.client
      .from("showrooms")
      .insert({
        owner_user_id: owner.id,
        business_name: `Approval Test Showroom ${testId}`,
        phone: "+254712345678",
        email: `approval-test-${testId}@example.com`,
        city: "Nairobi",
      })
      .select()
      .single();
    if (error || !showroom) throw error ?? new Error("showroom not created");
    showroomId = showroom.id;
  });

  afterAll(async () => {
    await admin.storage.from("showroom-documents").remove([`${showroomId}/doc.pdf`]);
    if (showroomId) await admin.from("showrooms").delete().eq("id", showroomId);
    for (const u of [owner, otherCustomer, adminUser]) if (u?.id) await deleteTestUser(u.id);
  });

  it("admin can reject a pending showroom", async () => {
    const { data, error } = await adminUser.client.from("showrooms").update({ status: "REJECTED" }).eq("id", showroomId).select();
    expect(error).toBeNull();
    expect(data?.[0]?.status).toBe("REJECTED");
  });

  it("a rejected showroom's owner can register again (the one-active-showroom index doesn't block REJECTED)", async () => {
    const { error } = await owner.client.from("showrooms").insert({
      owner_user_id: owner.id,
      business_name: `Approval Test Retry ${testId}`,
      phone: "+254712345678",
      email: `approval-test-retry-${testId}@example.com`,
      city: "Nairobi",
    });
    expect(error).toBeNull();
    await admin.from("showrooms").delete().eq("business_name", `Approval Test Retry ${testId}`);
  });

  it("admin can approve a showroom and set verified together with status", async () => {
    // Reset to PENDING first (admin bypasses the self-approval trigger, so
    // this is a legitimate direct fixture reset, not something the app UI
    // itself needs to do).
    await admin.from("showrooms").update({ status: "PENDING", verified: false }).eq("id", showroomId);

    const { data, error } = await adminUser.client.from("showrooms").update({ status: "APPROVED", verified: true }).eq("id", showroomId).select();
    expect(error).toBeNull();
    expect(data?.[0]?.status).toBe("APPROVED");
    expect(data?.[0]?.verified).toBe(true);
  });

  describe("signed URLs for a private showroom document", () => {
    let documentStoragePath: string;

    beforeAll(async () => {
      documentStoragePath = `${showroomId}/doc.pdf`;
      const { error: uploadError } = await owner.client.storage.from("showroom-documents").upload(documentStoragePath, tinyDoc, { upsert: true });
      if (uploadError) throw uploadError;
    });

    it("the owner can create a signed URL for their own document", async () => {
      const { data, error } = await owner.client.storage.from("showroom-documents").createSignedUrl(documentStoragePath, 60);
      expect(error).toBeNull();
      expect(data?.signedUrl).toEqual(expect.stringContaining("http"));
    });

    it("an admin can create a signed URL for any showroom's document", async () => {
      const { data, error } = await adminUser.client.storage.from("showroom-documents").createSignedUrl(documentStoragePath, 60);
      expect(error).toBeNull();
      expect(data?.signedUrl).toEqual(expect.stringContaining("http"));
    });

    it("a different, unrelated customer cannot create a signed URL for someone else's document", async () => {
      const { data, error } = await otherCustomer.client.storage.from("showroom-documents").createSignedUrl(documentStoragePath, 60);
      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });
  });
});
