import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture showroom/vehicle/admin (per this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const OWNER_EMAIL = `e2e-financing-owner-fixture-${unique}@harakagari.local`;
const OWNER_PASSWORD = "e2e-financing-owner-fixture-password-123";
const OTHER_OWNER_EMAIL = `e2e-financing-other-owner-fixture-${unique}@harakagari.local`;
const OTHER_OWNER_PASSWORD = "e2e-financing-other-owner-fixture-password-123";
const ADMIN_EMAIL = `e2e-financing-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-financing-admin-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run financing-application E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let vehicleId: string;
let vehiclePath: string;
let showroomId: string;

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
  const otherOwnerId = await ensureFixtureUser(OTHER_OWNER_EMAIL, OTHER_OWNER_PASSWORD);
  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", otherOwnerId);

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Financing Showroom ${unique}`,
      phone: "+254712345678",
      email: `e2e-financing-showroom-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  await supabase.from("showrooms").insert({
    owner_user_id: otherOwnerId,
    business_name: `E2E Financing Other Showroom ${unique}`,
    phone: "+254712345679",
    email: `e2e-financing-other-showroom-${unique}@example.com`,
    status: "APPROVED",
    verified: true,
  });

  // Real financing config so the "Apply for Financing" button actually
  // renders instead of the disabled placeholder (see hasRealFinancing in
  // [brand]/[slug]/page.tsx).
  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Financing Vehicle ${unique}`,
      make: `E2efinancing${unique}`,
      model: "Alpha",
      year: 2022,
      price: 2_000_000,
      status: "ACTIVE",
      installment_enabled: true,
      financing_down_payment_type: "PERCENT",
      financing_down_payment_percent: 10,
      financing_interest_rate: 13,
      financing_tenure_options_months: [12, 24, 36],
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
  vehiclePath = `/e2efinancing${unique}/alpha-${vehicleId}`;
});

test.afterEach(async () => {
  await admin().from("financing_applications").delete().eq("vehicle_id", vehicleId);
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

async function fillFinancingForm(page: import("@playwright/test").Page, overrides: Partial<Record<string, string>> = {}) {
  await page.getByLabel("Full Name").fill(overrides.name ?? "Anonymous Applicant");
  await page.getByLabel("Email").fill(overrides.email ?? `anon-applicant-${unique}@example.com`);
  await page.getByLabel("Phone").fill(overrides.phone ?? "712345678");
  await page.getByLabel("National ID / Passport No.").fill(overrides.nationalId ?? "12345678");
  await page.getByLabel("Employment Status").selectOption(overrides.employmentStatus ?? "EMPLOYED");
  await page.getByLabel("Monthly Income (KES)").fill(overrides.monthlyIncome ?? "80000");
  if (overrides.desiredDownPayment !== undefined) {
    await page.getByLabel("Desired Down Payment (KES)").fill(overrides.desiredDownPayment);
  }
  await page.getByLabel("Desired Loan Term").selectOption(overrides.desiredTenureMonths ?? "24");
}

test("an anonymous visitor can submit a real financing application, stored with no customer_id", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  await fillFinancingForm(page);
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("financing_applications")
    .select("customer_id, contact_name, contact_phone, status, employment_status, desired_tenure_months")
    .eq("vehicle_id", vehicleId)
    .single();
  expect(data?.customer_id).toBeNull();
  expect(data?.contact_name).toBe("Anonymous Applicant");
  expect(data?.contact_phone).toBe("+254712345678");
  expect(data?.status).toBe("NEW");
  expect(data?.employment_status).toBe("EMPLOYED");
  expect(data?.desired_tenure_months).toBe(24);
});

test("the form validates required fields before submitting", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Monthly Income (KES)").fill("-5");
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Enter a valid email address")).toBeVisible();

  const { count } = await admin().from("financing_applications").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId);
  expect(count).toBe(0);
});

test("admin can see the application, opening it marks it VIEWED and drops the sidebar badge", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();
  await fillFinancingForm(page, { name: "Admin Visibility Test", email: `admin-visibility-${unique}@example.com` });
  await page.getByRole("button", { name: "Submit Application" }).click();
  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/financing");
  const row = page.getByRole("row", { name: /Admin Visibility Test/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("new", { exact: true })).toBeVisible();

  // Scoped to the "Financing" nav link specifically — the admin sidebar
  // also shows unread-count badges for Inquiries and due Payments, so a
  // blanket "any digit in the sidebar" check would be ambiguous once more
  // than one badge can be non-zero at the same time.
  const financingNavLink = page.getByRole("link", { name: "Financing" });
  const badgeBefore = await financingNavLink.getByText(/^\d+$/).textContent();

  await row.click();
  await expect(page.getByRole("dialog").getByText("12345678", { exact: true })).toBeVisible();
  await page.getByLabel("Close").click();

  await expect(row.getByText("viewed", { exact: true })).toBeVisible();

  // markFinancingApplicationViewedAction's revalidatePath only invalidates
  // the cache — a real navigation is what actually re-fetches the
  // sidebar's server-rendered unread count.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const badgeAfterCount = await page.getByRole("link", { name: "Financing" }).getByText(/^\d+$/).count();
  if (Number(badgeBefore) - 1 === 0) {
    expect(badgeAfterCount).toBe(0);
  } else {
    const badgeAfter = await page.getByRole("link", { name: "Financing" }).getByText(/^\d+$/).textContent();
    expect(Number(badgeAfter)).toBe(Number(badgeBefore) - 1);
  }
});

test("the owning showroom sees the application in its own dashboard, but a different showroom does not", async ({ page, browser }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();
  await fillFinancingForm(page, { name: "Showroom Scoping Test", email: `showroom-scoping-${unique}@example.com` });
  await page.getByRole("button", { name: "Submit Application" }).click();
  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  // Separate browser contexts (not just re-navigating on the same page) so
  // each identity gets its own session — same convention as
  // vehicle-inquiry.spec.ts's own showroom-scoping test.
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto("/login");
  await ownerPage.getByLabel("Email address").fill(OWNER_EMAIL);
  await ownerPage.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await ownerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await ownerPage.waitForURL(/\/dashboard$/);
  await ownerPage.goto("/dashboard/financing", { waitUntil: "domcontentloaded" });
  await expect(ownerPage.getByText("Showroom Scoping Test")).toBeVisible();
  await ownerContext.close();

  const otherOwnerContext = await browser.newContext();
  const otherOwnerPage = await otherOwnerContext.newPage();
  await otherOwnerPage.goto("/login");
  await otherOwnerPage.getByLabel("Email address").fill(OTHER_OWNER_EMAIL);
  await otherOwnerPage.getByLabel("Password", { exact: true }).fill(OTHER_OWNER_PASSWORD);
  await otherOwnerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await otherOwnerPage.waitForURL(/\/dashboard$/);
  await otherOwnerPage.goto("/dashboard/financing", { waitUntil: "domcontentloaded" });
  await expect(otherOwnerPage.getByText("Showroom Scoping Test")).toHaveCount(0);
  await otherOwnerContext.close();
});
