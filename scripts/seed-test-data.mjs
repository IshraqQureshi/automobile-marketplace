#!/usr/bin/env node
// Seeds a full, realistic local-dev test scenario: an admin, an APPROVED
// showroom (with test-drive availability configured) owned by a real user,
// and an ACTIVE vehicle with financing configured — enough to manually
// exercise vehicle discovery, the finance calculator, financing
// applications, inquiries, and appointment booking end to end.
//
// Follows the same rules as scripts/seed-admin.mjs: local Supabase only
// unless explicitly overridden, credentials never written to a file, only
// printed once to the terminal.
//
// Usage:
//   npm run seed:test-data

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Is .env.local populated?");
  process.exit(1);
}

const isLocalUrl = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(supabaseUrl);
if (!isLocalUrl && process.env.SEED_TEST_DATA_ALLOW_REMOTE !== "true") {
  console.error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL (${supabaseUrl}) is not a local Supabase instance.`);
  console.error("Set SEED_TEST_DATA_ALLOW_REMOTE=true to explicitly override this check.");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@harakagari.local";
const ADMIN_PASSWORD = "TestingAdmin!123";
const OWNER_EMAIL = "owner@harakagari.local";
const OWNER_PASSWORD = "TestingOwner!123";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExistingUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email === targetEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser(email, password) {
  const existing = await findExistingUserByEmail(email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`Failed to create ${email}`);
  return data.user.id;
}

async function main() {
  const adminId = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  const { error: promoteError } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);
  if (promoteError) throw promoteError;

  const ownerId = await ensureUser(OWNER_EMAIL, OWNER_PASSWORD);

  const { data: existingShowroom } = await supabase.from("showrooms").select("id").eq("owner_user_id", ownerId).maybeSingle();

  let showroomId = existingShowroom?.id;
  if (showroomId) {
    const { error } = await supabase
      .from("showrooms")
      .update({
        status: "APPROVED",
        verified: true,
        slot_duration_minutes: 30,
        buffer_minutes: 15,
      })
      .eq("id", showroomId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("showrooms")
      .insert({
        owner_user_id: ownerId,
        business_name: "HarakaGari Test Motors",
        description: "Local dev/QA test showroom — safe to book test drives, submit inquiries, and apply for financing against.",
        phone: "+254712345000",
        email: OWNER_EMAIL,
        address: "Waiyaki Way",
        city: "Nairobi",
        status: "APPROVED",
        verified: true,
        slot_duration_minutes: 30,
        buffer_minutes: 15,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("showroom not created");
    showroomId = data.id;
  }

  // Mon–Fri, 09:00–17:00 — real availability so "Schedule Test Drive" is live.
  await supabase.from("showroom_availability").delete().eq("showroom_id", showroomId);
  const { error: availabilityError } = await supabase.from("showroom_availability").insert(
    [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      showroom_id: showroomId,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00",
      is_available: true,
    })),
  );
  if (availabilityError) throw availabilityError;

  const { data: existingVehicle } = await supabase
    .from("vehicles")
    .select("id, make, model")
    .eq("showroom_id", showroomId)
    .eq("title", "Test Drive Demo — Land Cruiser Prado")
    .maybeSingle();

  let vehicle = existingVehicle;
  if (!vehicle) {
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        showroom_id: showroomId,
        title: "Test Drive Demo — Land Cruiser Prado",
        make: "Toyota",
        model: "Land Cruiser Prado",
        variant: "VX-L",
        year: 2023,
        price: 8_500_000,
        mileage: 12_000,
        fuel_type: "Diesel",
        transmission: "Automatic",
        body_type: "SUV",
        color: "Pearl White",
        description: "Seed fixture for local testing of vehicle discovery, the finance calculator, financing applications, inquiries, and appointment booking.",
        status: "ACTIVE",
        installment_enabled: true,
        bank_finance_enabled: true,
        financing_down_payment_percent: 20,
        financing_interest_rate: 14,
        financing_tenure_options_months: [12, 24, 36],
        financing_partner: "HarakaGari Finance Partners",
        financing_insurance_percent: 3,
      })
      .select("id, make, model, variant")
      .single();
    if (error || !data) throw error ?? new Error("vehicle not created");
    vehicle = data;
  } else {
    // Re-select variant too — the existing-vehicle lookup above only fetched
    // id/make/model, and it's needed below for the same slug scheme the app
    // itself uses.
    const { data: refetched } = await supabase.from("vehicles").select("id, make, model, variant").eq("id", vehicle.id).single();
    vehicle = refetched ?? vehicle;
    await supabase.from("vehicles").update({ status: "ACTIVE", installment_enabled: true, bank_finance_enabled: true }).eq("id", vehicle.id);
  }

  // Mirrors src/features/vehicle/slug.ts's slugify()/getVehicleDetailPath()
  // exactly (including the model+variant name-slug rule) — duplicated
  // rather than imported because this is a plain Node ESM script with no
  // TypeScript loader configured, so it can't import a .ts module directly.
  const slugify = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const brandSlug = slugify(vehicle.make);
  const name = vehicle.variant ? `${vehicle.model} ${vehicle.variant}` : vehicle.model;
  const nameSlugPrefix = slugify(name);
  const nameSlug = `${nameSlugPrefix ? `${nameSlugPrefix}-` : ""}${vehicle.id}`;
  const vehicleUrl = `http://localhost:3000/${brandSlug}/${nameSlug}`;

  console.log("\n✅ Test data ready.\n");
  console.log("Admin login  → http://localhost:3000/admin/login");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log("\nShowroom owner login → http://localhost:3000/login");
  console.log(`   Email:    ${OWNER_EMAIL}`);
  console.log(`   Password: ${OWNER_PASSWORD}`);
  console.log(`   Showroom: HarakaGari Test Motors (APPROVED, Mon–Fri 09:00–17:00, 30 min slots / 15 min buffer)`);
  console.log(`\nTest vehicle (finance calculator, financing application, inquiry, test drive all live):`);
  console.log(`   ${vehicleUrl}`);
  console.log("\nThis is local-dev test data only — fixed credentials, never use against a real deployment.\n");
}

main().catch((error) => {
  console.error("Failed to seed test data:", error.message ?? error);
  process.exit(1);
});
