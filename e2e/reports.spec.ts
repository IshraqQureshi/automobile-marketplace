import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Analytics/Reports dashboards (showroom-owner + super-admin). Own
// dedicated fixture showroom/vehicle/admin (per this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const OWNER_EMAIL = `e2e-reports-owner-fixture-${unique}@harakagari.local`;
const OWNER_PASSWORD = "e2e-reports-owner-fixture-password-123";
const ADMIN_EMAIL = `e2e-reports-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-reports-admin-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run reports E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let showroomId: string;
let vehicleId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function ensureFixtureUser(email: string, password: string): Promise<string> {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = data.users.find((u) => u.email === email)?.id;
    if (!userId) {
      const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.user) {
        userId = created.user.id;
      } else {
        throw new Error(`Failed to create fixture user ${email}: ${error?.message}`);
      }
    }
    await supabase.auth.admin.updateUserById(userId, { password });
    return userId;
  }

  const ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Reports Showroom ${unique}`,
      phone: "+254712345678",
      email: `e2e-reports-showroom-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Reports Vehicle ${unique}`,
      make: `E2ereports${unique}`,
      model: "Alpha",
      year: 2022,
      price: 2_000_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;

  // One of each activity type, so every report section has real data to show.
  await supabase.from("vehicle_inquiries").insert({
    vehicle_id: vehicleId,
    contact_name: "Reports Inquiry Customer",
    contact_email: `reports-inquiry-${unique}@example.com`,
    contact_phone: "+254700000001",
    message: "Is this still available?",
  });
  await supabase.from("financing_applications").insert({
    vehicle_id: vehicleId,
    contact_name: "Reports Financing Customer",
    contact_email: `reports-financing-${unique}@example.com`,
    contact_phone: "+254700000002",
    employment_status: "EMPLOYED",
    monthly_income: 100000,
    national_id: "12345678",
    desired_down_payment: 500000,
    desired_tenure_months: 12,
  });
  const { data: appt } = await supabase
    .from("appointments")
    .insert({
      booking_reference: `BK-REPORTS-${unique}`,
      customer_id: null,
      showroom_id: showroomId,
      appointment_date: "2026-12-01",
      start_time: "10:00",
      end_time: "10:30",
      contact_name: "Reports Appointment Customer",
      contact_email: `reports-appointment-${unique}@example.com`,
      contact_phone: "+254700000003",
    })
    .select("id")
    .single();
  if (appt) await supabase.from("appointment_vehicles").insert({ appointment_id: appt.id, vehicle_id: vehicleId });

  // vehicle_views has no client-facing SELECT/INSERT policy at all (only
  // record_vehicle_view() touches it) — the service-role client is the
  // only way a fixture can seed a view here, same as the app's own report
  // queries need it to READ this table.
  await supabase.from("vehicle_views").insert([
    { vehicle_id: vehicleId, viewer_key: `ip:e2e-reports-viewer-1-${unique}` },
    { vehicle_id: vehicleId, viewer_key: `ip:e2e-reports-viewer-2-${unique}` },
  ]);
  await supabase.from("vehicles").update({ view_count: 2 }).eq("id", vehicleId);
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

test("showroom owner sees real activity counts on their Reports page and can export a CSV", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto("/dashboard/reports", { waitUntil: "domcontentloaded" });

  // StatCard renders a fixed structure: a labeled card whose own label
  // paragraph text is exactly "Appointments", with the numeric value in a
  // sibling <p> inside the same card — scoped this way rather than a bare
  // page-wide "1" search, since sidebar badges elsewhere on the page can
  // also legitimately show "1".
  const appointmentsCard = page.locator("div.rounded-xl", { has: page.getByText("Appointments", { exact: true }) });
  await expect(appointmentsCard.locator("p.font-mono")).toHaveText("1");

  await expect(page.getByText("Alpha").first()).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).first().click()]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test("admin sees the showroom's activity reflected in the platform-wide Reports page", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/reports", { waitUntil: "domcontentloaded" });

  await expect(page.getByText(`E2E Reports Showroom ${unique}`)).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`E2E Reports Showroom ${unique}`) })).toContainText("1");
});
