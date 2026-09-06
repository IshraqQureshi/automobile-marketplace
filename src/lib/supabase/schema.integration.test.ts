import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Integration tests for FND-003 schema: constraints, foreign keys, unique
 * rules, and the trusted trigger functions from the 018/019 migrations.
 *
 * Requires a running local Supabase instance (`npx supabase start`) with
 * these migrations applied (`npx supabase db reset`). Makes real inserts
 * against whatever project the env vars point to — never run against
 * production.
 *
 * RLS is not enabled yet (FND-004) — these tests use the admin client (and
 * a real signed-in session for the self-role-escalation test) to exercise
 * database-level integrity rules, independent of authorization.
 */
describe("Database schema integrity (integration)", () => {
  const supabase = createAdminClient();
  const testId = Date.now();

  let customerId: string;
  let customerEmail: string;
  const customerPassword = "test-password-not-real-123";
  let showroomOwnerId: string;
  let otherShowroomOwnerId: string;
  let showroomId: string;
  let otherShowroomId: string;
  let vehicleId: string;
  let otherVehicleId: string;

  beforeAll(async () => {
    customerEmail = `test-customer-${testId}@example.com`;
    const { data: customer, error: customerErr } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: customerPassword,
      email_confirm: true,
    });
    if (customerErr || !customer.user) throw customerErr ?? new Error("customer not created");
    customerId = customer.user.id;

    const { data: owner, error: ownerErr } = await supabase.auth.admin.createUser({
      email: `test-owner-${testId}@example.com`,
      password: "test-password-not-real-456",
      email_confirm: true,
    });
    if (ownerErr || !owner.user) throw ownerErr ?? new Error("owner not created");
    showroomOwnerId = owner.user.id;

    const { data: showroom, error: showroomErr } = await supabase
      .from("showrooms")
      .insert({
        owner_user_id: showroomOwnerId,
        business_name: "Test Showroom",
        phone: "0700000000",
        email: "showroom@example.com",
      })
      .select()
      .single();
    if (showroomErr || !showroom) throw showroomErr ?? new Error("showroom not created");
    showroomId = showroom.id;

    // A distinct owner — showrooms_owner_user_id_active_unique (added
    // alongside SHR-001 registration) now permits only one PENDING/APPROVED/
    // SUSPENDED showroom per owner, so this can no longer share
    // showroomOwnerId with the showroom above.
    const { data: otherOwner, error: otherOwnerErr } = await supabase.auth.admin.createUser({
      email: `test-other-owner-${testId}@example.com`,
      password: "test-password-not-real-789",
      email_confirm: true,
    });
    if (otherOwnerErr || !otherOwner.user) throw otherOwnerErr ?? new Error("other owner not created");
    otherShowroomOwnerId = otherOwner.user.id;

    const { data: otherShowroom, error: otherShowroomErr } = await supabase
      .from("showrooms")
      .insert({
        owner_user_id: otherShowroomOwnerId,
        business_name: "Other Showroom",
        phone: "0700000001",
        email: "other-showroom@example.com",
      })
      .select()
      .single();
    if (otherShowroomErr || !otherShowroom) throw otherShowroomErr ?? new Error("other showroom not created");
    otherShowroomId = otherShowroom.id;

    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .insert({ showroom_id: showroomId, title: "Test Car", make: "Toyota", model: "Corolla", year: 2020, price: 1000000 })
      .select()
      .single();
    if (vehicleErr || !vehicle) throw vehicleErr ?? new Error("vehicle not created");
    vehicleId = vehicle.id;

    const { data: otherVehicle, error: otherVehicleErr } = await supabase
      .from("vehicles")
      .insert({ showroom_id: otherShowroomId, title: "Other Car", make: "Honda", model: "Civic", year: 2021, price: 1500000 })
      .select()
      .single();
    if (otherVehicleErr || !otherVehicle) throw otherVehicleErr ?? new Error("other vehicle not created");
    otherVehicleId = otherVehicle.id;
  });

  afterAll(async () => {
    // Showrooms cascade-delete their vehicles/media/inquiries/appointments.
    // Auth users cascade-delete their profiles. Showrooms must go first —
    // showrooms.owner_user_id -> profiles is ON DELETE RESTRICT.
    if (showroomId) await supabase.from("showrooms").delete().eq("id", showroomId);
    if (otherShowroomId) await supabase.from("showrooms").delete().eq("id", otherShowroomId);
    if (customerId) await supabase.auth.admin.deleteUser(customerId);
    if (showroomOwnerId) await supabase.auth.admin.deleteUser(showroomOwnerId);
    if (otherShowroomOwnerId) await supabase.auth.admin.deleteUser(otherShowroomOwnerId);
  });

  it("auto-creates a CUSTOMER profile when an auth user is created", async () => {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", customerId).single();
    expect(error).toBeNull();
    expect(data?.role).toBe("CUSTOMER");
  });

  it("prevents a user from changing their own role", async () => {
    const anon = createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      email: customerEmail,
      password: customerPassword,
    });
    expect(signInErr).toBeNull();
    if (!signIn.session) throw new Error("sign-in did not return a session");

    const asCustomer = createSupabaseClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } } },
    );

    const { error } = await asCustomer.from("profiles").update({ role: "ADMIN" }).eq("id", customerId);
    expect(error).not.toBeNull();

    const { data: after } = await supabase.from("profiles").select("role").eq("id", customerId).single();
    expect(after?.role).toBe("CUSTOMER");
  });

  it("rejects a vehicle with a non-existent showroom_id (foreign key)", async () => {
    const { error } = await supabase
      .from("vehicles")
      .insert({ showroom_id: "00000000-0000-0000-0000-000000000000", title: "Ghost Car", make: "Ghost", model: "Ghost", year: 2020, price: 1 });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23503");
  });

  it("rejects an invalid vehicle status (enum)", async () => {
    const { error } = await supabase
      .from("vehicles")
      // @ts-expect-error — deliberately invalid enum value to prove the DB rejects it
      .insert({ showroom_id: showroomId, title: "Bad Status", make: "X", model: "Y", year: 2020, price: 1, status: "NOT_A_STATUS" });
    expect(error).not.toBeNull();
  });

  it("rejects a negative vehicle price", async () => {
    const { error } = await supabase
      .from("vehicles")
      .insert({ showroom_id: showroomId, title: "Negative Price", make: "X", model: "Y", year: 2020, price: -1 });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("rejects negative mileage", async () => {
    const { error } = await supabase
      .from("vehicles")
      .insert({ showroom_id: showroomId, title: "Negative Mileage", make: "X", model: "Y", year: 2020, price: 1, mileage: -1 });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("rejects financing_down_payment_percent out of 0-100 range", async () => {
    const { error } = await supabase
      .from("vehicles")
      .insert({
        showroom_id: showroomId,
        title: "Bad Financing",
        make: "X",
        model: "Y",
        year: 2020,
        price: 1,
        financing_down_payment_percent: 150,
      });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("prevents more than one primary image per vehicle", async () => {
    const { error: firstErr } = await supabase
      .from("vehicle_media")
      .insert({ vehicle_id: vehicleId, storage_path: "a.jpg", is_primary: true });
    expect(firstErr).toBeNull();

    const { error: secondErr } = await supabase
      .from("vehicle_media")
      .insert({ vehicle_id: vehicleId, storage_path: "b.jpg", is_primary: true });
    expect(secondErr).not.toBeNull();
    expect(secondErr?.code).toBe("23505");

    await supabase.from("vehicle_media").delete().eq("vehicle_id", vehicleId);
  });

  it("prevents duplicate favorites for the same customer/vehicle", async () => {
    const { error: firstErr } = await supabase.from("favorites").insert({ customer_id: customerId, vehicle_id: vehicleId });
    expect(firstErr).toBeNull();

    const { error: secondErr } = await supabase.from("favorites").insert({ customer_id: customerId, vehicle_id: vehicleId });
    expect(secondErr).not.toBeNull();
    expect(secondErr?.code).toBe("23505");

    await supabase.from("favorites").delete().eq("customer_id", customerId).eq("vehicle_id", vehicleId);
  });

  it("derives vehicle_inquiries.showroom_id from the vehicle, ignoring a client-supplied value", async () => {
    const { data, error } = await supabase
      .from("vehicle_inquiries")
      .insert({
        vehicle_id: vehicleId,
        // Deliberately wrong — the trigger must overwrite this.
        showroom_id: otherShowroomId,
        customer_id: customerId,
        message: "Is this still available?",
        contact_name: "Test Customer",
        contact_email: "test-customer@example.com",
        contact_phone: "+254712345678",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.showroom_id).toBe(showroomId);

    if (data) await supabase.from("vehicle_inquiries").delete().eq("id", data.id);
  });

  it("rejects a blank vehicle_inquiries message", async () => {
    const { error } = await supabase
      .from("vehicle_inquiries")
      // showroom_id is required by the generated Insert type but always
      // overwritten by the set_vehicle_inquiry_showroom trigger — any
      // placeholder value is fine here.
      .insert({
        vehicle_id: vehicleId,
        showroom_id: showroomId,
        customer_id: customerId,
        message: "   ",
        contact_name: "Test Customer",
        contact_email: "test-customer@example.com",
        contact_phone: "+254712345678",
      });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  describe("appointments and appointment_vehicles", () => {
    let appointmentId: string;

    beforeAll(async () => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          booking_reference: `BK-TEST-${testId}`,
          customer_id: customerId,
          showroom_id: showroomId,
          appointment_date: "2026-12-01",
          start_time: "10:00",
          end_time: "10:30",
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("appointment not created");
      appointmentId = data.id;
    });

    afterAll(async () => {
      if (appointmentId) await supabase.from("appointments").delete().eq("id", appointmentId);
    });

    it("rejects a duplicate booking_reference", async () => {
      const { error } = await supabase.from("appointments").insert({
        booking_reference: `BK-TEST-${testId}`,
        customer_id: customerId,
        showroom_id: showroomId,
        appointment_date: "2026-12-02",
        start_time: "11:00",
        end_time: "11:30",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505");
    });

    it("rejects an appointment where start_time is not before end_time", async () => {
      const { error } = await supabase.from("appointments").insert({
        booking_reference: `BK-TEST-${testId}-invalid-time`,
        customer_id: customerId,
        showroom_id: showroomId,
        appointment_date: "2026-12-03",
        start_time: "12:00",
        end_time: "12:00",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23514");
    });

    it("allows attaching a vehicle that belongs to the appointment's showroom", async () => {
      const { error } = await supabase
        .from("appointment_vehicles")
        .insert({ appointment_id: appointmentId, vehicle_id: vehicleId });
      expect(error).toBeNull();

      await supabase.from("appointment_vehicles").delete().eq("appointment_id", appointmentId);
    });

    it("rejects attaching a vehicle from a different showroom (cross-showroom integrity)", async () => {
      const { error } = await supabase
        .from("appointment_vehicles")
        .insert({ appointment_id: appointmentId, vehicle_id: otherVehicleId });
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/does not belong to the appointment's showroom/);
    });
  });

  describe("showroom_availability", () => {
    it("rejects an out-of-range day_of_week", async () => {
      const { error } = await supabase
        .from("showroom_availability")
        .insert({ showroom_id: showroomId, day_of_week: 7, start_time: "09:00", end_time: "17:00" });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23514");
    });

    it("rejects start_time not before end_time", async () => {
      const { error } = await supabase
        .from("showroom_availability")
        .insert({ showroom_id: showroomId, day_of_week: 1, start_time: "17:00", end_time: "09:00" });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23514");
    });
  });
});
