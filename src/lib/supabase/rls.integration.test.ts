import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createAnonClient, createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

/**
 * RLS authorization integration tests (FND-004). Requires a running local
 * Supabase instance with all migrations applied. Uses real signed-in
 * sessions per role (customer/showroom-owner/admin) plus an anon client —
 * not the admin client — to prove RLS actually enforces these boundaries,
 * not just that the application code happens to behave.
 *
 * Never run against a production project — this creates and deletes real
 * auth users.
 */
describe("RLS authorization (integration)", () => {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const testId = Date.now();

  let customerA: TestUser;
  let customerB: TestUser;
  let ownerA: TestUser;
  let ownerB: TestUser;
  let adminUser: TestUser;

  let showroomAId: string; // owned by ownerA, approved
  let showroomBId: string; // owned by ownerB, left PENDING
  let activeVehicleAId: string; // ACTIVE, belongs to showroomA (approved) — publicly visible
  let draftVehicleAId: string; // DRAFT, belongs to showroomA — owner/admin only
  let activeVehicleBId: string; // ACTIVE, belongs to showroomB (still PENDING) — must NOT be publicly visible

  beforeAll(async () => {
    customerA = await createTestUser();
    customerB = await createTestUser();
    ownerA = await createTestUser();
    ownerB = await createTestUser();
    adminUser = await createTestUser("ADMIN");

    // Showroom registration: any authenticated user submits their own
    // showroom row — role promotion to SHOWROOM is a later, separate
    // concern (SHR-001), not modeled yet.
    const { data: showroomA, error: showroomAErr } = await ownerA.client
      .from("showrooms")
      .insert({ owner_user_id: ownerA.id, business_name: `Showroom A ${testId}`, phone: "0700000000", email: `a-${testId}@example.com` })
      .select()
      .single();
    if (showroomAErr || !showroomA) throw showroomAErr ?? new Error("showroom A not created");
    showroomAId = showroomA.id;

    const { data: showroomB, error: showroomBErr } = await ownerB.client
      .from("showrooms")
      .insert({ owner_user_id: ownerB.id, business_name: `Showroom B ${testId}`, phone: "0700000001", email: `b-${testId}@example.com` })
      .select()
      .single();
    if (showroomBErr || !showroomB) throw showroomBErr ?? new Error("showroom B not created");
    showroomBId = showroomB.id;

    // Admin approves showroom A only; showroom B stays PENDING.
    const { error: approveErr } = await admin.from("showrooms").update({ status: "APPROVED" }).eq("id", showroomAId);
    if (approveErr) throw approveErr;

    const { data: activeA, error: activeAErr } = await ownerA.client
      .from("vehicles")
      .insert({ showroom_id: showroomAId, title: "Active A", make: "Toyota", model: "Corolla", year: 2020, price: 1000000, status: "ACTIVE" })
      .select()
      .single();
    if (activeAErr || !activeA) throw activeAErr ?? new Error("active vehicle A not created");
    activeVehicleAId = activeA.id;

    const { data: draftA, error: draftAErr } = await ownerA.client
      .from("vehicles")
      .insert({ showroom_id: showroomAId, title: "Draft A", make: "Toyota", model: "Camry", year: 2021, price: 1200000 })
      .select()
      .single();
    if (draftAErr || !draftA) throw draftAErr ?? new Error("draft vehicle A not created");
    draftVehicleAId = draftA.id;

    const { data: activeB, error: activeBErr } = await ownerB.client
      .from("vehicles")
      .insert({ showroom_id: showroomBId, title: "Active B (pending showroom)", make: "Honda", model: "Civic", year: 2019, price: 900000, status: "ACTIVE" })
      .select()
      .single();
    if (activeBErr || !activeB) throw activeBErr ?? new Error("active vehicle B not created");
    activeVehicleBId = activeB.id;
  });

  afterAll(async () => {
    if (showroomAId) await admin.from("showrooms").delete().eq("id", showroomAId);
    if (showroomBId) await admin.from("showrooms").delete().eq("id", showroomBId);
    for (const u of [customerA, customerB, ownerA, ownerB, adminUser]) {
      if (u?.id) await deleteTestUser(u.id);
    }
  });

  describe("profiles", () => {
    it("a customer cannot select another customer's profile", async () => {
      const { data, error } = await customerA.client.from("profiles").select().eq("id", customerB.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a customer can select their own profile", async () => {
      const { data, error } = await customerA.client.from("profiles").select().eq("id", customerA.id).single();
      expect(error).toBeNull();
      expect(data?.id).toBe(customerA.id);
    });

    it("a customer cannot update another customer's profile", async () => {
      const { data, error } = await customerA.client
        .from("profiles")
        .update({ full_name: "Hacked" })
        .eq("id", customerB.id)
        .select();
      expect(error).toBeNull(); // RLS silently filters — 0 rows affected, not a thrown error
      expect(data).toEqual([]);
    });

    it("admin can select any profile", async () => {
      const { data, error } = await adminUser.client.from("profiles").select().eq("id", customerA.id).single();
      expect(error).toBeNull();
      expect(data?.id).toBe(customerA.id);
    });

    it("a user cannot reactivate their own account after an admin deactivates it (code review finding #4)", async () => {
      const { error: deactivateErr } = await admin.from("profiles").update({ is_active: false }).eq("id", customerA.id);
      expect(deactivateErr).toBeNull();

      const { error: selfReactivateErr } = await customerA.client.from("profiles").update({ is_active: true }).eq("id", customerA.id);
      expect(selfReactivateErr).not.toBeNull();

      const { data: after } = await admin.from("profiles").select("is_active").eq("id", customerA.id).single();
      expect(after?.is_active).toBe(false);

      // Restore for the rest of the suite.
      await admin.from("profiles").update({ is_active: true }).eq("id", customerA.id);
    });
  });

  describe("showrooms", () => {
    it("a registrant cannot self-approve at insert time (code review finding #1)", async () => {
      const { data, error } = await customerB.client
        .from("showrooms")
        .insert({
          owner_user_id: customerB.id,
          business_name: `Self-Approved ${testId}`,
          phone: "0700000099",
          email: `selfapprove-${testId}@example.com`,
          status: "APPROVED",
          verified: true,
        })
        .select();
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("anon can see an APPROVED showroom", async () => {
      const { data, error } = await anon.from("showrooms").select().eq("id", showroomAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("anon cannot see a PENDING showroom", async () => {
      const { data, error } = await anon.from("showrooms").select().eq("id", showroomBId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("the owner can see their own PENDING showroom", async () => {
      const { data, error } = await ownerB.client.from("showrooms").select().eq("id", showroomBId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("a different showroom owner cannot update another showroom", async () => {
      const { data, error } = await ownerB.client
        .from("showrooms")
        .update({ business_name: "Hijacked" })
        .eq("id", showroomAId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("an owner cannot self-approve their own showroom", async () => {
      const { error } = await ownerB.client.from("showrooms").update({ status: "APPROVED" }).eq("id", showroomBId);
      expect(error).not.toBeNull();

      const { data: after } = await admin.from("showrooms").select("status").eq("id", showroomBId).single();
      expect(after?.status).toBe("PENDING");
    });

    it("admin can approve a showroom", async () => {
      const { error } = await admin.from("showrooms").update({ status: "APPROVED" }).eq("id", showroomBId);
      expect(error).toBeNull();

      const { data: after } = await admin.from("showrooms").select("status").eq("id", showroomBId).single();
      expect(after?.status).toBe("APPROVED");

      // Revert so the "anon cannot see PENDING" fixture assumption isn't
      // disturbed for any test re-run within this file.
      await admin.from("showrooms").update({ status: "PENDING" }).eq("id", showroomBId);
    });
  });

  describe("showroom_documents", () => {
    let documentId: string;

    beforeAll(async () => {
      const { data, error } = await ownerA.client
        .from("showroom_documents")
        .insert({ showroom_id: showroomAId, document_type: "business_license", storage_path: `${showroomAId}/license.pdf`, uploaded_by: ownerA.id })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("document not created");
      documentId = data.id;
    });

    it("a different showroom owner cannot see another showroom's documents", async () => {
      const { data, error } = await ownerB.client.from("showroom_documents").select().eq("id", documentId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("the owner can see their own showroom's documents", async () => {
      const { data, error } = await ownerA.client.from("showroom_documents").select().eq("id", documentId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("an unauthenticated (anon) request cannot see any showroom document", async () => {
      const { data, error } = await anon.from("showroom_documents").select().eq("id", documentId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("admin can see any showroom's documents", async () => {
      const { data, error } = await adminUser.client.from("showroom_documents").select().eq("id", documentId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("an owner cannot self-approve their own document at insert time (code review finding #2)", async () => {
      const { data, error } = await ownerA.client
        .from("showroom_documents")
        .insert({
          showroom_id: showroomAId,
          document_type: "business_license",
          storage_path: `${showroomAId}/self-approved.pdf`,
          uploaded_by: ownerA.id,
          status: "APPROVED",
          reviewed_by: ownerA.id,
        })
        .select();
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe("vehicles", () => {
    it("anon can see an ACTIVE vehicle from an APPROVED showroom", async () => {
      const { data, error } = await anon.from("vehicles").select().eq("id", activeVehicleAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("anon CANNOT see an ACTIVE vehicle whose showroom is still PENDING", async () => {
      const { data, error } = await anon.from("vehicles").select().eq("id", activeVehicleBId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("anon cannot see a DRAFT vehicle", async () => {
      const { data, error } = await anon.from("vehicles").select().eq("id", draftVehicleAId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("the owning showroom can see its own DRAFT vehicle", async () => {
      const { data, error } = await ownerA.client.from("vehicles").select().eq("id", draftVehicleAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("a customer cannot insert a vehicle", async () => {
      const { error } = await customerA.client
        .from("vehicles")
        .insert({ showroom_id: showroomAId, title: "Hacked Vehicle", make: "X", model: "Y", year: 2020, price: 1 });
      expect(error).not.toBeNull();
    });

    it("a different showroom owner cannot update another showroom's vehicle", async () => {
      const { data, error } = await ownerB.client
        .from("vehicles")
        .update({ price: 1 })
        .eq("id", activeVehicleAId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a customer cannot delete a vehicle", async () => {
      const { data, error } = await customerA.client.from("vehicles").delete().eq("id", activeVehicleAId).select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await admin.from("vehicles").select().eq("id", activeVehicleAId);
      expect(stillThere).toHaveLength(1);
    });
  });

  describe("favorites", () => {
    afterAll(async () => {
      await admin.from("favorites").delete().eq("vehicle_id", activeVehicleAId);
    });

    it("a customer cannot see another customer's favorites", async () => {
      const { error: insertErr } = await customerA.client.from("favorites").insert({ customer_id: customerA.id, vehicle_id: activeVehicleAId });
      expect(insertErr).toBeNull();

      const { data, error } = await customerB.client.from("favorites").select().eq("customer_id", customerA.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a customer cannot insert a favorite for another customer", async () => {
      const { error } = await customerB.client.from("favorites").insert({ customer_id: customerA.id, vehicle_id: draftVehicleAId });
      expect(error).not.toBeNull();
    });
  });

  describe("vehicle_inquiries", () => {
    let inquiryId: string;

    beforeAll(async () => {
      const { data, error } = await customerA.client
        .from("vehicle_inquiries")
        .insert({
          vehicle_id: activeVehicleAId,
          showroom_id: showroomAId,
          customer_id: customerA.id,
          message: "Still available?",
          contact_name: "Customer A",
          contact_email: "customer-a@example.com",
          contact_phone: "+254712345678",
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("inquiry not created");
      inquiryId = data.id;
    });

    it("a different showroom owner cannot see an inquiry addressed to another showroom", async () => {
      const { data, error } = await ownerB.client.from("vehicle_inquiries").select().eq("id", inquiryId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("the addressed showroom owner can see and mark the inquiry VIEWED", async () => {
      const { data: seen, error: seenErr } = await ownerA.client.from("vehicle_inquiries").select().eq("id", inquiryId);
      expect(seenErr).toBeNull();
      expect(seen).toHaveLength(1);

      const { error: updateErr } = await ownerA.client.from("vehicle_inquiries").update({ status: "VIEWED" }).eq("id", inquiryId);
      expect(updateErr).toBeNull();
    });

    it("the submitting customer can still see their own inquiry", async () => {
      const { data, error } = await customerA.client.from("vehicle_inquiries").select().eq("id", inquiryId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("showroom_availability", () => {
    let availabilityId: string;

    beforeAll(async () => {
      const { data, error } = await ownerA.client
        .from("showroom_availability")
        .insert({ showroom_id: showroomAId, day_of_week: 1, start_time: "09:00", end_time: "17:00" })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("availability not created");
      availabilityId = data.id;
    });

    it("any authenticated user can read availability (needed to book)", async () => {
      const { data, error } = await customerB.client.from("showroom_availability").select().eq("id", availabilityId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("a customer cannot modify a showroom's availability", async () => {
      const { data, error } = await customerB.client
        .from("showroom_availability")
        .update({ is_available: false })
        .eq("id", availabilityId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("appointments and appointment_vehicles", () => {
    let appointmentId: string;

    beforeAll(async () => {
      const { data, error } = await customerA.client
        .from("appointments")
        .insert({
          booking_reference: `BK-RLS-${testId}`,
          customer_id: customerA.id,
          showroom_id: showroomAId,
          appointment_date: "2026-12-15",
          start_time: "10:00",
          end_time: "10:30",
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("appointment not created");
      appointmentId = data.id;
    });

    it("a customer cannot self-confirm a booking at insert time (code review finding #3)", async () => {
      const { data, error } = await customerA.client
        .from("appointments")
        .insert({
          booking_reference: `BK-RLS-SELFCONFIRM-${testId}`,
          customer_id: customerA.id,
          showroom_id: showroomAId,
          appointment_date: "2026-12-16",
          start_time: "11:00",
          end_time: "11:30",
          status: "CONFIRMED",
        })
        .select();
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("a different customer cannot see another customer's appointment", async () => {
      const { data, error } = await customerB.client.from("appointments").select().eq("id", appointmentId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("the addressed showroom can see the appointment", async () => {
      const { data, error } = await ownerA.client.from("appointments").select().eq("id", appointmentId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("a different showroom cannot see the appointment", async () => {
      const { data, error } = await ownerB.client.from("appointments").select().eq("id", appointmentId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("the booking customer can attach a vehicle from the correct showroom", async () => {
      const { error } = await customerA.client
        .from("appointment_vehicles")
        .insert({ appointment_id: appointmentId, vehicle_id: activeVehicleAId });
      expect(error).toBeNull();
    });

    it("a different customer cannot see appointment_vehicles for someone else's appointment", async () => {
      const { data, error } = await customerB.client.from("appointment_vehicles").select().eq("appointment_id", appointmentId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("notifications, manual_payments, activity_logs (no non-admin access)", () => {
    it("a customer cannot see another user's notifications and cannot insert any", async () => {
      const { error: insertErr } = await customerA.client
        .from("notifications")
        .insert({ user_id: customerA.id, channel: "EMAIL", notification_type: "BOOKING_CREATED", recipient: "a@example.com" });
      expect(insertErr).not.toBeNull();
    });

    it("a customer cannot select manual_payments", async () => {
      const { data, error } = await customerA.client.from("manual_payments").select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a customer cannot insert a manual_payment", async () => {
      const { error } = await customerA.client
        .from("manual_payments")
        .insert({ amount: 1000, payment_method: "cash", recorded_by: customerA.id });
      expect(error).not.toBeNull();
    });

    it("admin can record a manual_payment", async () => {
      const { data, error } = await adminUser.client
        .from("manual_payments")
        .insert({ amount: 1000, payment_method: "cash", recorded_by: adminUser.id })
        .select()
        .single();
      expect(error).toBeNull();
      if (data) await admin.from("manual_payments").delete().eq("id", data.id);
    });

    it("a showroom owner cannot select activity_logs", async () => {
      const { data, error } = await ownerA.client.from("activity_logs").select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("admin can select activity_logs", async () => {
      const { error } = await adminUser.client.from("activity_logs").select();
      expect(error).toBeNull();
    });
  });

  describe("vehicle_imports", () => {
    let importId: string;

    beforeAll(async () => {
      const { data, error } = await ownerA.client
        .from("vehicle_imports")
        .insert({ showroom_id: showroomAId, uploaded_by: ownerA.id, file_name: "stock.csv" })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("import not created");
      importId = data.id;
    });

    it("a different showroom owner cannot see another showroom's import records", async () => {
      const { data, error } = await ownerB.client.from("vehicle_imports").select().eq("id", importId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a showroom cannot fabricate a successful import at insert time (code review finding #5)", async () => {
      const { data, error } = await ownerA.client
        .from("vehicle_imports")
        .insert({
          showroom_id: showroomAId,
          uploaded_by: ownerA.id,
          file_name: "fake-success.csv",
          status: "COMPLETED",
          total_rows: 100,
          successful_rows: 100,
          failed_rows: 0,
        })
        .select();
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe("system_settings", () => {
    it("anon can read a public setting", async () => {
      const { data, error } = await anon.from("system_settings").select().eq("key", "site_name").single();
      expect(error).toBeNull();
      expect(data?.is_public).toBe(true);
    });

    it("anon cannot read a private setting", async () => {
      const { data, error } = await anon.from("system_settings").select().eq("key", "admin_emails");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a customer cannot update any setting", async () => {
      const { data, error } = await customerA.client
        .from("system_settings")
        .update({ value: "false" })
        .eq("key", "maintenance_mode")
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("admin can update an editable setting", async () => {
      const { error } = await adminUser.client
        .from("system_settings")
        .update({ value: "true" })
        .eq("key", "maintenance_mode");
      expect(error).toBeNull();

      // Revert.
      await admin.from("system_settings").update({ value: "false" }).eq("key", "maintenance_mode");
    });

    it("nobody can insert a new setting key through the client — no insert policy exists", async () => {
      const { error } = await adminUser.client
        .from("system_settings")
        .insert({ key: "not_in_the_approved_registry", value: "1", value_type: "NUMBER", category: "general" });
      expect(error).not.toBeNull();
    });
  });
});
