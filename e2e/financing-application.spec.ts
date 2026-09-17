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
      financing_insurance_percent_psv: 4.5,
      financing_insurance_percent_private: 3,
      financing_tenure_options_months: [12, 24, 36],
      financing_tracker_options: [
        { duration: "1 Year", price: 15_000 },
        { duration: "2 Years", price: 25_000 },
      ],
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
  if (overrides.desiredDownPaymentPercent !== undefined) {
    await page.getByLabel("Desired Down Payment (%)").fill(overrides.desiredDownPaymentPercent);
  }
  await page.getByLabel("Desired Loan Term").selectOption(overrides.desiredTenureMonths ?? "24");
}

test("an anonymous visitor can submit a real financing application, stored with no customer_id", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  // The fixture vehicle is financing_down_payment_type PERCENT with
  // financing_down_payment_percent 10 — the field defaults to that percent,
  // not a KES amount (client feedback: "Down payment change it to
  // percentage").
  await expect(page.getByLabel("Desired Down Payment (%)")).toHaveValue("10");
  await fillFinancingForm(page);
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("financing_applications")
    .select("customer_id, contact_name, contact_phone, status, employment_status, desired_tenure_months, desired_down_payment")
    .eq("vehicle_id", vehicleId)
    .single();
  expect(data?.customer_id).toBeNull();
  expect(data?.contact_name).toBe("Anonymous Applicant");
  expect(data?.contact_phone).toBe("+254712345678");
  expect(data?.status).toBe("NEW");
  expect(data?.employment_status).toBe("EMPLOYED");
  expect(data?.desired_tenure_months).toBe(24);
  // 10% of the fixture vehicle's 2,000,000 price, converted before submit.
  expect(data?.desired_down_payment).toBe(200_000);
});

test("a custom desired down payment percent converts to the equivalent KES amount on submit", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  await fillFinancingForm(page, { desiredDownPaymentPercent: "25", email: `custom-percent-${unique}@example.com` });
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("financing_applications")
    .select("desired_down_payment")
    .eq("contact_email", `custom-percent-${unique}@example.com`)
    .single();
  // 25% of 2,000,000.
  expect(data?.desired_down_payment).toBe(500_000);
});

test("the desired tracker option (matching the calculator's own options) can be selected and is stored", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  await page.getByLabel("Desired Tracker").selectOption({ label: "2 Years — Ksh 25,000" });
  await fillFinancingForm(page, { email: `tracker-choice-${unique}@example.com` });
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("financing_applications")
    .select("desired_tracker_duration")
    .eq("contact_email", `tracker-choice-${unique}@example.com`)
    .single();
  expect(data?.desired_tracker_duration).toBe("2 Years");
});

test("the desired insurance type (matching the calculator's own selector) can be selected and is stored", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  // Both PSV (4.5%) and Private (3%) are configured on the fixture vehicle
  // — defaults to PSV, matching FinancingCalculator's own default.
  await expect(page.getByLabel("Desired Insurance")).toHaveValue("PSV");
  // Client feedback: the percentage alone wasn't enough — the computed KES
  // amount (price 2,000,000 × 4.5%) must show too, same as Desired Down
  // Payment's own "≈ Ksh X" convention. Scoped to the dialog specifically
  // — the Financing Calculator on the same page can coincidentally show
  // the same figure for its own (independent) default selection.
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Ksh 90,000", { exact: false })).toBeVisible();
  await page.getByLabel("Desired Insurance").selectOption("PRIVATE");
  // Recomputes instantly when the selection changes (2,000,000 × 3%).
  await expect(dialog.getByText("Ksh 60,000", { exact: false })).toBeVisible();
  await fillFinancingForm(page, { email: `insurance-choice-${unique}@example.com` });
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Application submitted!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("financing_applications")
    .select("desired_insurance_type")
    .eq("contact_email", `insurance-choice-${unique}@example.com`)
    .single();
  expect(data?.desired_insurance_type).toBe("PRIVATE");
});

test("the interest rate is shown read-only, matching the vehicle's own configured rate, and isn't a real form field", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  // The fixture vehicle's financing_interest_rate is 13 (PERCENT type,
  // the default) — a static display, not an <input>/<select> the
  // applicant can change.
  await expect(page.getByText("13% per year", { exact: true })).toBeVisible();

  // Client feedback: the percentage alone wasn't enough — the computed
  // total-interest KES amount must show too, using the same real formula
  // the calculator itself uses (loanAmount × rate × tenure/12). Defaults:
  // 10% down payment (loan 1,800,000) × 13% × (12/12 months) = 234,000.
  await expect(page.getByRole("dialog").getByText("Ksh 234,000", { exact: false })).toBeVisible();
});

test("a blank desired down payment percent is rejected, not silently treated as 0%", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Apply for Financing" }).click();

  await page.getByLabel("Desired Down Payment (%)").fill("");
  await fillFinancingForm(page, { email: `blank-percent-${unique}@example.com` });
  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText("Enter a valid down payment percentage")).toBeVisible();

  const { count } = await admin()
    .from("financing_applications")
    .select("id", { count: "exact", head: true })
    .eq("contact_email", `blank-percent-${unique}@example.com`);
  expect(count).toBe(0);
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
