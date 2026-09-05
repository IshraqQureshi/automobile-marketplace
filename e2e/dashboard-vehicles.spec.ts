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

test("visiting /dashboard while signed out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("a pending showroom sees a review-status message and cannot reach vehicle management", async ({ page }) => {
  await loginAsPendingOwner(page);
  await expect(page.getByText("Your showroom is under review")).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage vehicles" })).toHaveCount(0);

  // Direct URL access must be blocked server-side too, not just hidden from nav.
  await page.goto("/dashboard/vehicles");
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Your showroom is under review")).toBeVisible();
});

test("an approved owner can create a vehicle as a draft, edit it, and publish it", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Test Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/vehicles");
  await page.getByRole("button", { name: "New vehicle" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.locator("#vehicle-title").fill(title);
  await dialog.locator("#vehicle-make").fill("Toyota");
  await dialog.locator("#vehicle-model").fill("Camry");
  await dialog.locator("#vehicle-year").fill("2019");
  await dialog.locator("#vehicle-price").fill("2500000");
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Vehicle created as a draft.")).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await expect(row.getByRole("combobox")).toHaveValue("DRAFT");

  // Edit
  await row.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#vehicle-price").fill("2600000");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Vehicle updated.")).toBeVisible();
  // Intl.NumberFormat("en-KE", { currency: "KES" }) renders the locale
  // currency symbol "Ksh", not the literal ISO code "KES".
  await expect(row.getByText("Ksh 2,600,000")).toBeVisible();

  // Publish
  await row.getByRole("combobox").selectOption("ACTIVE");
  await expect(page.getByText("Marked as published.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(title) }).getByRole("combobox")).toHaveValue("ACTIVE");
});

test("required fields show one inline validation message, not a duplicate banner", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/vehicles");
  await page.getByRole("button", { name: "New vehicle" }).click();

  const dialog = page.getByRole("dialog");
  // A brand-new dialog must show no validation error before any interaction
  // (regression coverage for the Dialog focus-steal bug fixed in PR #25).
  await expect(dialog.getByText("Title is required")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText("Title is required")).toHaveCount(1);
  await expect(dialog.getByText("Make is required")).toHaveCount(1);
  await expect(dialog.getByText("Model is required")).toHaveCount(1);
  await expect(page.getByText("Vehicle created as a draft.")).toHaveCount(0);
});

test("an approved owner can upload a vehicle photo and it becomes the primary image", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Photo Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/vehicles");
  await page.getByRole("button", { name: "New vehicle" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#vehicle-title").fill(title);
  await createDialog.locator("#vehicle-make").fill("Toyota");
  await createDialog.locator("#vehicle-model").fill("Camry");
  await createDialog.locator("#vehicle-year").fill("2019");
  await createDialog.locator("#vehicle-price").fill("2500000");
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Vehicle created as a draft.")).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(title) });
  await row.getByRole("button", { name: "Photos" }).click();

  const photosDialog = page.getByRole("dialog");
  await photosDialog
    .locator("#vehicle-photo-upload")
    .setInputFiles({ name: "vehicle.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await expect(page.getByText("Photos uploaded.")).toBeVisible();
  await expect(photosDialog.getByText("Primary", { exact: true })).toBeVisible();

  // A second photo, set as primary, then deleting the (now non-primary)
  // first photo — the dialog stays open across all three mutations and
  // must reflect each one without being closed and reopened (regression
  // coverage: the dialog used to hold a stale snapshot of the vehicle's
  // photos captured only when it was first opened).
  await photosDialog
    .locator("#vehicle-photo-upload")
    .setInputFiles({ name: "vehicle-2.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await expect(photosDialog.getByRole("button", { name: "Set as primary" })).toHaveCount(1);

  await photosDialog.getByRole("button", { name: "Set as primary" }).click();
  await expect(photosDialog.getByRole("button", { name: "Set as primary" })).toHaveCount(1);

  await photosDialog.getByRole("button", { name: "Delete photo" }).first().click();
  await expect(photosDialog.getByRole("button", { name: "Delete photo" })).toHaveCount(1);
  await expect(photosDialog.getByText("Primary", { exact: true })).toBeVisible();
});

test("an approved owner can mark a vehicle sold and deactivate it", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Status Vehicle ${unique}`;

  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/vehicles");
  await page.getByRole("button", { name: "New vehicle" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#vehicle-title").fill(title);
  await createDialog.locator("#vehicle-make").fill("Toyota");
  await createDialog.locator("#vehicle-model").fill("Camry");
  await createDialog.locator("#vehicle-year").fill("2019");
  await createDialog.locator("#vehicle-price").fill("2500000");
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Vehicle created as a draft.")).toBeVisible();

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
