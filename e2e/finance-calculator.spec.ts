import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { calculateFinanceEstimate, trackerDurationToMonths } from "../src/features/vehicle/finance-calculator";

// Own dedicated fixture showroom/vehicle (per this repo's convention). The
// vehicle carries real, showroom-configured financing fields — the existing
// fixture vehicles in vehicle-discovery.spec.ts deliberately have none, which
// is what proves the "Financing details not provided" empty state there;
// this file proves the opposite path: a real, working calculator.
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const OWNER_EMAIL = `e2e-finance-owner-fixture-${unique}@harakagari.local`;
const OWNER_PASSWORD = "e2e-finance-owner-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run finance-calculator E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const PRICE = 3_000_000;
const DOWN_PAYMENT_PERCENT = 20;
const INTEREST_RATE = 12.5;
const INSURANCE_PERCENT_PSV = 4.5;
const INSURANCE_PERCENT_PRIVATE = 3;
const TENURE_OPTIONS = [12, 24];
const TRACKER_OPTIONS = [
  { duration: "1 Year", price: 15_000 },
  { duration: "2 Years", price: 28_000 },
];

let showroomId: string;
let vehicleId: string;
let vehiclePath: string;

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
    return userId;
  }

  const ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Finance Showroom ${unique}`,
      phone: "+254712345682",
      email: `e2e-finance-showroom-${unique}@example.com`,
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
      title: `E2E Finance Vehicle ${unique}`,
      make: `E2efinance${unique}`,
      model: "Gamma",
      year: 2023,
      price: PRICE,
      status: "ACTIVE",
      installment_enabled: true,
      financing_down_payment_type: "PERCENT",
      financing_down_payment_percent: DOWN_PAYMENT_PERCENT,
      financing_interest_rate: INTEREST_RATE,
      financing_insurance_percent_psv: INSURANCE_PERCENT_PSV,
      financing_insurance_percent_private: INSURANCE_PERCENT_PRIVATE,
      financing_tenure_options_months: TENURE_OPTIONS,
      financing_tracker_options: TRACKER_OPTIONS,
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
  vehiclePath = `/e2efinance${unique}/gamma-${vehicleId}`;
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

function parseCurrency(text: string): number {
  return Number(text.replace(/[^0-9]/g, ""));
}

test("a vehicle with real showroom-configured financing renders a working calculator with the correct initial estimate", async ({ page }) => {
  await page.goto(vehiclePath);

  await expect(page.getByRole("heading", { name: "Financing Calculator" })).toBeVisible();
  await expect(page.getByText("Financing details not provided for this listing")).toHaveCount(0);

  // Defaults to the first tenure/tracker/insurance-type option (12 months,
  // 1 Year tracker, PSV — since both PSV and Private are configured, PSV
  // wins as the first available option).
  const expected = calculateFinanceEstimate({
    price: PRICE,
    downPaymentType: "PERCENT",
    downPaymentPercent: DOWN_PAYMENT_PERCENT,
    downPaymentAmount: null,
    interestRatePercentPerYear: INTEREST_RATE,
    insurancePercent: INSURANCE_PERCENT_PSV,
    trackerFee: TRACKER_OPTIONS[0]!.price,
    trackerDurationMonths: trackerDurationToMonths(TRACKER_OPTIONS[0]!.duration),
    tenureMonths: TENURE_OPTIONS[0]!,
  });

  const monthlyPaymentText = await page.getByText("Est. Monthly Payment").locator("xpath=following-sibling::p[1]").textContent();
  expect(parseCurrency(monthlyPaymentText ?? "")).toBe(expected.monthlyPayment);
});

test("the HP Installments button scrolls smoothly down to the Financing Calculator section", async ({ page }) => {
  await page.goto(vehiclePath);
  await expect(page.getByRole("heading", { name: "Financing Calculator" })).toBeVisible();

  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBe(0);

  await page.getByRole("link", { name: "HP Installments", exact: true }).click();

  // A plain hash-link jumps instantly (scrollY would already be at its
  // final value on the very next tick) — sampling shortly after the click
  // and before the animation would have finished proves this one actually
  // animates rather than jumping, without asserting on exact timing/easing.
  await page.waitForTimeout(100);
  const midScroll = await page.evaluate(() => window.scrollY);
  expect(midScroll).toBeGreaterThan(0);

  await expect(async () => {
    const finalScroll = await page.evaluate(() => window.scrollY);
    expect(finalScroll).toBeGreaterThan(midScroll);
  }).toPass({ timeout: 2000 });

  await expect(page.getByRole("heading", { name: "Financing Calculator" })).toBeInViewport();
});

test("changing loan term and tracker duration recalculates the estimate instantly, matching the real formula", async ({ page }) => {
  await page.goto(vehiclePath);
  await expect(page.getByRole("heading", { name: "Financing Calculator" })).toBeVisible();

  await page.getByLabel("Loan term").selectOption("24");
  await page.getByLabel("Tracker duration").selectOption("1");
  await page.getByLabel("Insurance type").selectOption("PRIVATE");

  const expected = calculateFinanceEstimate({
    price: PRICE,
    downPaymentType: "PERCENT",
    downPaymentPercent: DOWN_PAYMENT_PERCENT,
    downPaymentAmount: null,
    interestRatePercentPerYear: INTEREST_RATE,
    insurancePercent: INSURANCE_PERCENT_PRIVATE,
    trackerFee: TRACKER_OPTIONS[1]!.price,
    trackerDurationMonths: trackerDurationToMonths(TRACKER_OPTIONS[1]!.duration),
    tenureMonths: TENURE_OPTIONS[1]!,
  });

  const monthlyPaymentText = await page.getByText("Est. Monthly Payment").locator("xpath=following-sibling::p[1]").textContent();
  expect(parseCurrency(monthlyPaymentText ?? "")).toBe(expected.monthlyPayment);

  const totalPayableText = await page.getByText(/Total payable:/).textContent();
  expect(parseCurrency(totalPayableText ?? "")).toBe(expected.totalPayable);
});

test("a vehicle with installment enabled but no other financing data configured shows the honest empty state, not a fabricated estimate", async ({
  page,
}) => {
  const supabase = admin();
  const { data: plainVehicle, error } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Finance No-Financing Vehicle ${unique}`,
      make: `E2efinancenone${unique}`,
      model: "Delta",
      year: 2020,
      price: 1_500_000,
      status: "ACTIVE",
      installment_enabled: true,
    })
    .select("id")
    .single();
  if (error || !plainVehicle) throw error ?? new Error("plain vehicle not created");

  try {
    await page.goto(`/e2efinancenone${unique}/delta-${plainVehicle.id}`);
    await expect(page.getByRole("heading", { name: "Financing Calculator" })).toBeVisible();
    await expect(page.getByText("Financing details not provided for this listing")).toBeVisible();
  } finally {
    await supabase.from("vehicles").delete().eq("id", plainVehicle.id);
  }
});

// Client feedback: "If Finance calculator is disable from the showroom
// admin panel then on frontend its section should be hidden" —
// installmentEnabled (the dashboard's "Available on installment (HP)"
// checkbox) is that toggle. Before this fix, the section stayed visible
// whenever bankFinanceEnabled was also on (it defaults true, admin-only),
// even with installment explicitly off.
test("the Financing Calculator section is hidden entirely (not an empty state) when installment is disabled, even with bank finance still enabled", async ({
  page,
}) => {
  const supabase = admin();
  const { data: installmentOffVehicle, error } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Finance Installment Off Vehicle ${unique}`,
      make: `E2efinanceoff${unique}`,
      model: "Epsilon",
      year: 2021,
      price: 1_800_000,
      status: "ACTIVE",
      installment_enabled: false,
      bank_finance_enabled: true,
      financing_down_payment_type: "PERCENT",
      financing_down_payment_percent: DOWN_PAYMENT_PERCENT,
      financing_interest_rate: INTEREST_RATE,
      financing_tenure_options_months: TENURE_OPTIONS,
    })
    .select("id")
    .single();
  if (error || !installmentOffVehicle) throw error ?? new Error("installment-off vehicle not created");

  try {
    await page.goto(`/e2efinanceoff${unique}/epsilon-${installmentOffVehicle.id}`);
    // Section (including its own heading) is absent entirely — not the
    // "not provided" empty state, which would be misleading here since
    // financing genuinely IS configured, just not via HP installment.
    await expect(page.getByRole("heading", { name: "Financing Calculator" })).toHaveCount(0);
    await expect(page.getByText("Financing details not provided for this listing")).toHaveCount(0);

    // Apply for Financing must stay visible — bank finance is still on.
    await expect(page.getByRole("button", { name: "Apply for Financing" })).toBeVisible();
    // Bank Finance still scrolls somewhere real (the Apply section), not to
    // a now-missing #financing-calculator anchor.
    await page.getByRole("link", { name: "Bank Finance", exact: true }).click();
    await expect(async () => {
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    }).toPass({ timeout: 2000 });
  } finally {
    await supabase.from("vehicles").delete().eq("id", installmentOffVehicle.id);
  }
});
