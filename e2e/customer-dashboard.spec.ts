import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// AUTH-004 (Customer Dashboard) + AUTH-005 (Favorites). Own dedicated
// fixture showroom/vehicle/customer (same convention as
// e2e/vehicle-discovery.spec.ts) so the favorites/appointments assertions
// are deterministic regardless of whatever other real/demo data exists.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-customer-dashboard-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-customer-dashboard-owner-fixture-password-123";
const CUSTOMER_EMAIL = "e2e-customer-dashboard-customer-fixture@harakagari.local";
const CUSTOMER_PASSWORD = "e2e-customer-dashboard-customer-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run customer-dashboard E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const unique = Date.now();
const MAKE = `E2Ecustdash${unique}`;
let showroomId: string;
let ownerId: string;
let customerId: string;
let vehicleId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser(email: string) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === email);
  }

  async function ensureFixtureUser(email: string, password: string): Promise<string> {
    let userId = (await findFixtureUser(email))?.id;
    if (!userId) {
      const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.user) {
        userId = created.user.id;
      } else {
        userId = (await findFixtureUser(email))?.id;
        if (!userId) throw new Error(`Failed to create fixture user ${email}: ${error?.message}`);
      }
    }
    await supabase.auth.admin.updateUserById(userId, { password });
    return userId;
  }

  ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  customerId = await ensureFixtureUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

  // Clean slate for this customer's own favorites/appointments so the
  // dashboard assertions below only ever see this run's own fixture data.
  await supabase.from("favorites").delete().eq("customer_id", customerId);
  await supabase.from("appointments").delete().eq("customer_id", customerId);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Customer Dashboard Showroom ${unique}`,
      phone: "+254712345688",
      email: `e2e-customer-dashboard-showroom-${unique}@example.com`,
      status: "APPROVED",
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `${MAKE} Alpha`,
      make: MAKE,
      model: "Alpha",
      year: 2022,
      price: 2_500_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("favorites").delete().eq("customer_id", customerId);
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

async function signInAsCustomer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/account$/);
}

test("an unauthenticated visitor is redirected to login when clicking the favorite heart", async ({ page }) => {
  const supabase = admin();
  const { data: vehicleRow } = await supabase.from("vehicles").select("make, model").eq("id", vehicleId).single();
  const path = `/${MAKE.toLowerCase()}/${vehicleRow!.model.toLowerCase()}-${vehicleId}`;

  await page.goto(path);
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await page.waitForURL(/\/login$/);
});

test("a signed-in customer can favorite a vehicle from its detail page, then see it on their dashboard", async ({ page }) => {
  const supabase = admin();
  const { data: vehicleRow } = await supabase.from("vehicles").select("make, model").eq("id", vehicleId).single();
  const path = `/${MAKE.toLowerCase()}/${vehicleRow!.model.toLowerCase()}-${vehicleId}`;

  await signInAsCustomer(page);

  await page.goto(path);
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await expect(page.getByRole("button", { name: "Remove from favorites" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My Favorites" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
});

test("a signed-in customer can remove a favorite from the vehicle detail page", async ({ page }) => {
  const supabase = admin();
  await supabase.from("favorites").upsert({ customer_id: customerId, vehicle_id: vehicleId }, { onConflict: "customer_id,vehicle_id" });

  const { data: vehicleRow } = await supabase.from("vehicles").select("make, model").eq("id", vehicleId).single();
  const path = `/${MAKE.toLowerCase()}/${vehicleRow!.model.toLowerCase()}-${vehicleId}`;

  await signInAsCustomer(page);
  await page.goto(path);
  await expect(page.getByRole("button", { name: "Remove from favorites" })).toBeVisible();
  await page.getByRole("button", { name: "Remove from favorites" }).click();
  await expect(page.getByRole("button", { name: "Add to favorites" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByText("No favorites yet.")).toBeVisible();
});

test("a signed-in customer's own appointment shows on their dashboard", async ({ page }) => {
  const supabase = admin();
  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      customer_id: customerId,
      showroom_id: showroomId,
      booking_reference: `E2E-${unique}`,
      status: "PENDING",
      appointment_date: "2026-12-01",
      start_time: "10:00",
      end_time: "10:30",
      contact_name: "E2E Customer",
      contact_email: CUSTOMER_EMAIL,
      contact_phone: "+254700000000",
    })
    .select("id")
    .single();
  if (error || !appointment) throw error ?? new Error("appointment not created");

  await signInAsCustomer(page);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My Appointments" })).toBeVisible();
  await expect(page.getByText(`E2E Customer Dashboard Showroom ${unique}`)).toBeVisible();
  await expect(page.getByText("Pending")).toBeVisible();

  await supabase.from("appointments").delete().eq("id", appointment.id);
});
