import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture accounts (per this repo's convention — every spec
// file uses distinct fixture emails, e.g. e2e-admin-showrooms-fixture@...,
// e2e-showroom-fixture@...) rather than reusing another spec's fixture,
// since this spec needs a showroom whose status stays APPROVED across the
// whole file (only its vehicles are cleaned up between tests), unlike
// admin-showrooms.spec.ts's per-test throwaway showroom.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-dashboard-vehicles-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-dashboard-vehicles-owner-fixture-password-123";
const PENDING_OWNER_EMAIL = "e2e-dashboard-vehicles-pending-fixture@harakagari.local";
const PENDING_OWNER_PASSWORD = "e2e-dashboard-vehicles-pending-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run dashboard-vehicles E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// A real (tiny, 1x1) PNG rather than a text fixture masquerading as an
// image — the upload's client-side MIME check and the bucket's own
// allowed_mime_types would otherwise both accept a mislabeled text file,
// silently masking a real "image never uploaded" bug (same reasoning as
// TINY_PNG_BASE64 in e2e/admin-showrooms.spec.ts).
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let ownerId: string;
let showroomId: string;
let pendingOwnerId: string;
let pendingShowroomId: string;

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
  pendingOwnerId = await ensureFixtureUser(PENDING_OWNER_EMAIL, PENDING_OWNER_PASSWORD);

  // Clear out any leftover showroom from a previous interrupted run before
  // creating a fresh one — showrooms_owner_user_id_active_unique allows
  // only one PENDING/APPROVED/SUSPENDED showroom per owner.
  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", pendingOwnerId);

  const { data: showroom, error } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Dashboard Vehicles Showroom ${Date.now()}`,
      phone: "+254712345678",
      email: "e2e-dashboard-vehicles-showroom@example.com",
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (error || !showroom) throw error ?? new Error("showroom not created");
  showroomId = showroom.id;

  const { data: pendingShowroom, error: pendingError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: pendingOwnerId,
      business_name: `E2E Dashboard Vehicles Pending Showroom ${Date.now()}`,
      phone: "+254712345679",
      email: "e2e-dashboard-vehicles-pending-showroom@example.com",
    })
    .select("id")
    .single();
  if (pendingError || !pendingShowroom) throw pendingError ?? new Error("pending showroom not created");
  pendingShowroomId = pendingShowroom.id;
});

test.afterEach(async () => {
  await admin().from("vehicles").delete().eq("showroom_id", showroomId);
});

test.afterAll(async () => {
  await admin().from("showrooms").delete().in("id", [showroomId, pendingShowroomId]);
});

async function loginAsFixtureOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");
}

async function loginAsPendingOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(PENDING_OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PENDING_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");
}

/**
 * Fills the minimum required fields on /dashboard/vehicles/new, submits,
 * and returns the created vehicle's id (parsed from the edit-page redirect
 * URL). Brand/Model use the real seeded catalog (Toyota/Camry — see
 * supabase/migrations/20260905010002_seed_catalog_data.sql) rather than
 * free text, since the form now sources both from admin-managed dropdowns.
 */
async function createVehicleViaForm(page: import("@playwright/test").Page, title: string): Promise<string> {
  await page.goto("/dashboard/vehicles/new");
  await page.locator("#vehicle-title").fill(title);
  await page.locator("#vehicle-brand").selectOption({ label: "Toyota" });
  await page.locator("#vehicle-model").selectOption({ label: "Camry" });
  await page.locator("#vehicle-year").fill("2019");
  await page.locator("#vehicle-price").fill("2500000");
  await page.getByRole("button", { name: "Create vehicle" }).click();
  await page.waitForURL(/\/dashboard\/vehicles\/[^/]+\/edit$/);
  const match = /\/dashboard\/vehicles\/([^/]+)\/edit$/.exec(page.url());
  if (!match?.[1]) throw new Error(`Could not parse vehicle id from URL: ${page.url()}`);
  return match[1];
}

test("visiting /dashboard while signed out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("the dashboard layout has no site header or footer", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await expect(page.locator("header")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sell your car" })).toHaveCount(0);
});

test("a pending showroom sees a review-status message and cannot reach vehicle management", async ({ page }) => {
  await loginAsPendingOwner(page);
  await expect(page.getByText("Your showroom is under review")).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage vehicles" })).toHaveCount(0);

  // Direct URL access must be blocked server-side too, not just hidden from nav.
  await page.goto("/dashboard/vehicles");
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Your showroom is under review")).toBeVisible();

  await page.goto("/dashboard/vehicles/new");
  await page.waitForURL("**/dashboard");
});

test("an approved owner can create a vehicle, land on its edit page, edit it, and publish it", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Test Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await createVehicleViaForm(page, title);
  await expect(page.getByText("Vehicle created as a draft.")).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Photo gallery")).toBeVisible();

  // Edit, right there on the same page
  await page.locator("#vehicle-price").fill("2600000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Vehicle updated.")).toBeVisible();

  // Back on the list, the change and status control are both visible.
  await page.goto("/dashboard/vehicles");
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toBeVisible();
  // Intl.NumberFormat("en-KE", { currency: "KES" }) renders the locale
  // currency symbol "Ksh", not the literal ISO code "KES".
  await expect(row.getByText("Ksh 2,600,000")).toBeVisible();
  await expect(row.getByRole("combobox")).toHaveValue("DRAFT");

  await row.getByRole("combobox").selectOption("ACTIVE");
  await expect(page.getByText("Marked as published.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(title) }).getByRole("combobox")).toHaveValue("ACTIVE");
});

test("required fields show one inline validation message, not a duplicate banner", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/vehicles/new");

  // The page must show no validation error before any interaction
  // (regression coverage for the Dialog focus-steal bug fixed in PR #25 —
  // still relevant now that the form lives on a plain page, not a dialog).
  await expect(page.getByText("Title is required")).toHaveCount(0);

  await page.getByRole("button", { name: "Create vehicle" }).click();
  await expect(page.getByText("Title is required")).toHaveCount(1);
  await expect(page.getByText("Vehicle created as a draft.")).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard\/vehicles\/new$/);
});

test("specification and financing fields save and reload correctly", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Spec Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await createVehicleViaForm(page, title);

  await page.locator("#vehicle-engine").fill("2.0L Turbo Petrol");
  await page.locator("#vehicle-interior").fill("Leather");
  await page.locator("#vehicle-doors").fill("4");
  await page.locator("#vehicle-seats").fill("5");
  await page.locator("#vehicle-country-of-origin").fill("Japan");

  await page.getByLabel("Available on installment (HP)").check();
  await page.locator("#vehicle-down-payment-value").fill("20");
  await page.locator("#vehicle-interest-rate").fill("13.5");
  await page.locator("#vehicle-insurance-percent").fill("3");
  await page.locator("#vehicle-tracker-1yr").fill("15000");
  await page.getByLabel("24 months").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Vehicle updated.")).toBeVisible();

  await page.reload();
  await expect(page.locator("#vehicle-engine")).toHaveValue("2.0L Turbo Petrol");
  await expect(page.locator("#vehicle-doors")).toHaveValue("4");
  await expect(page.locator("#vehicle-seats")).toHaveValue("5");
  await expect(page.getByLabel("Available on installment (HP)")).toBeChecked();
  await expect(page.locator("#vehicle-down-payment-value")).toHaveValue("20");
  await expect(page.locator("#vehicle-tracker-1yr")).toHaveValue("15000");
  await expect(page.getByLabel("24 months")).toBeChecked();

  // Switching deposit type to Fixed swaps in a fresh fixed-amount input at
  // the same id (the percent and fixed inputs are two different elements
  // rendered by a ternary, not one element with a changed binding). This
  // <select> was already present in the very first paint after the reload
  // above (installment was already enabled from the previous save), so an
  // interaction fired the instant the page becomes actionable can land
  // before hydration attaches its change handler and get silently
  // overwritten on the next render — retry the select until the DOM
  // genuinely reflects it, rather than trusting one attempt.
  await expect(async () => {
    await page.getByLabel("Deposit type").selectOption("FIXED");
    await expect(page.getByLabel("Deposit type")).toHaveValue("FIXED");
  }).toPass({ timeout: 10_000 });
  await page.locator("#vehicle-down-payment-value").fill("500000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Vehicle updated.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Deposit type")).toHaveValue("FIXED");
  await expect(page.locator("#vehicle-down-payment-value")).toHaveValue("500000");
});

test("an invalid financing field left over after disabling installment doesn't silently block Save", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Hidden Financing Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await createVehicleViaForm(page, title);

  await page.getByLabel("Available on installment (HP)").check();
  await page.locator("#vehicle-interest-rate").fill("-5");
  await page.getByLabel("Available on installment (HP)").uncheck();
  await page.locator("#vehicle-doors").fill("4");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Vehicle updated.")).toBeVisible();
});

test("an approved owner can upload a vehicle photo and it becomes the featured image", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Photo Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await createVehicleViaForm(page, title);

  await page
    .locator("#vehicle-photo-upload")
    .setInputFiles({ name: "vehicle.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await expect(page.getByText("Photos uploaded.")).toBeVisible();
  await expect(page.getByText("Featured", { exact: true })).toBeVisible();

  // A second photo, set as featured, then deleting the (now non-featured)
  // first photo — the section stays mounted across all three mutations and
  // must reflect each one, matching the same "no stale snapshot" coverage
  // this had when it was a dialog.
  await page
    .locator("#vehicle-photo-upload")
    .setInputFiles({ name: "vehicle-2.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await expect(page.getByRole("button", { name: "Set as featured image" })).toHaveCount(1);

  await page.getByRole("button", { name: "Set as featured image" }).click();
  await expect(page.getByRole("button", { name: "Set as featured image" })).toHaveCount(1);

  await page.getByRole("button", { name: "Delete photo" }).first().click();
  await expect(page.getByRole("button", { name: "Delete photo" })).toHaveCount(1);
  await expect(page.getByText("Featured", { exact: true })).toBeVisible();
});

test("an approved owner can mark a vehicle sold and deactivate it", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Status Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await createVehicleViaForm(page, title);
  await page.goto("/dashboard/vehicles");

  const row = page.getByRole("row", { name: new RegExp(title) });
  const status = row.getByRole("combobox");

  await status.selectOption("SOLD");
  await expect(page.getByText("Marked as sold.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(title) }).getByRole("combobox")).toHaveValue("SOLD");

  await row.getByRole("combobox").selectOption("INACTIVE");
  await expect(page.getByText("Marked as removed.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(title) }).getByRole("combobox")).toHaveValue("INACTIVE");
});

test("a vehicle whose make doesn't match any catalog brand keeps its original text on save", async ({ page }) => {
  // Simulates a listing that predates the Brand catalog dropdown, or whose
  // brand was since renamed/removed from the catalog — the dropdown should
  // start unselected without silently discarding the original make/model.
  const { data: vehicle, error } = await admin()
    .from("vehicles")
    .insert({ showroom_id: showroomId, title: "Legacy Listing", make: "Discontinued Motors", model: "Old Model", year: 2015, price: 800000 })
    .select("id")
    .single();
  if (error || !vehicle) throw error ?? new Error("vehicle not created");

  await loginAsFixtureOwner(page);
  await page.goto(`/dashboard/vehicles/${vehicle.id}/edit`);

  await expect(page.locator("#vehicle-brand")).toHaveValue("");
  await expect(page.getByText("Current value: Discontinued Motors (not in the catalog)")).toBeVisible();
  await expect(page.getByText("Current value: Old Model (not in the catalog)")).toBeVisible();

  await page.locator("#vehicle-price").fill("850000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Vehicle updated.")).toBeVisible();

  const { data: updated } = await admin().from("vehicles").select("make, model").eq("id", vehicle.id).single();
  expect(updated?.make).toBe("Discontinued Motors");
  expect(updated?.model).toBe("Old Model");
});
