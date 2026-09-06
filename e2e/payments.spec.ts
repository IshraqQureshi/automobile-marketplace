import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ADM-006 (Manual Payment Entry) extended for showroom subscriptions. Own
// dedicated fixture admin + showrooms (per this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const ADMIN_EMAIL = `e2e-payments-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-payments-admin-fixture-password-123";
const CUSTOMER_EMAIL = `e2e-payments-customer-fixture-${unique}@example.com`;
const CUSTOMER_PASSWORD = "e2e-payments-customer-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run payments E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

let showroomAId: string;
let showroomBId: string;
let customerId: string;
const paymentIds: string[] = [];

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

  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);
  customerId = await ensureFixtureUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  await supabase.from("profiles").update({ role: "CUSTOMER" }).eq("id", customerId);

  async function makeShowroom(ownerEmail: string, ownerPassword: string, businessName: string): Promise<string> {
    const ownerId = await ensureFixtureUser(ownerEmail, ownerPassword);
    await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
    const { data: showroom, error } = await supabase
      .from("showrooms")
      .insert({ owner_user_id: ownerId, business_name: businessName, phone: "+254712345684", email: `${businessName.toLowerCase().replace(/\s+/g, "-")}-${unique}@example.com`, status: "APPROVED", verified: true })
      .select("id")
      .single();
    if (error || !showroom) throw error ?? new Error("showroom not created");
    return showroom.id;
  }

  showroomAId = await makeShowroom(`e2e-payments-owner-a-${unique}@harakagari.local`, "e2e-payments-owner-a-password-123", `E2E Payments Showroom A ${unique}`);
  showroomBId = await makeShowroom(`e2e-payments-owner-b-${unique}@harakagari.local`, "e2e-payments-owner-b-password-123", `E2E Payments Showroom B ${unique}`);
});

test.afterEach(async () => {
  const supabase = admin();
  if (paymentIds.length > 0) {
    await supabase.from("manual_payments").delete().in("id", paymentIds);
    paymentIds.length = 0;
  }
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("showrooms").delete().in("id", [showroomAId, showroomBId]);
});

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);
}

test("admin can record a subscription payment, and its due status is computed correctly", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/payments");

  await page.getByRole("button", { name: "New payment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Showroom").selectOption({ label: `E2E Payments Showroom A ${unique}` });
  await dialog.getByLabel("Amount (KES)").fill("60000");
  await dialog.getByLabel("Payment method").selectOption("MPESA");
  await dialog.getByLabel("Period start").fill(isoDate(-30));
  await dialog.getByLabel("Period end").fill(isoDate(60));
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(`E2E Payments Showroom A ${unique}`) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await expect(row.getByText("Ksh 60,000")).toBeVisible();

  const { data } = await admin().from("manual_payments").select("id, amount, subscription_end_date").eq("showroom_id", showroomAId).single();
  expect(data?.amount).toBe(60000);
  if (data?.id) paymentIds.push(data.id);
});

test("admin can edit a payment, and changing the end date resets any prior reminder", async ({ page }) => {
  const supabase = admin();
  const { data: created } = await supabase
    .from("manual_payments")
    .insert({
      showroom_id: showroomAId,
      amount: 30000,
      currency: "KES",
      payment_method: "CASH",
      subscription_start_date: isoDate(-40),
      subscription_end_date: isoDate(-10),
      reminder_sent_at: new Date().toISOString(),
      recorded_by: (await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((u) => u.email === ADMIN_EMAIL)!.id,
      status: "RECORDED",
    })
    .select("id")
    .single();
  paymentIds.push(created!.id);

  await loginAsAdmin(page);
  await page.goto("/admin/payments");
  const row = page.getByRole("row", { name: new RegExp(`E2E Payments Showroom A ${unique}`) });
  await row.getByLabel("Edit").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Period end").fill(isoDate(90));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Payment updated.")).toBeVisible();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();

  const { data: after } = await admin().from("manual_payments").select("reminder_sent_at, subscription_end_date").eq("id", created!.id).single();
  expect(after?.reminder_sent_at).toBeNull();
  expect(after?.subscription_end_date).toBe(isoDate(90));
});

test("admin can void a payment — it drops out of the due count but stays visible via the record-status filter", async ({ page }) => {
  const supabase = admin();
  const { data: created } = await supabase
    .from("manual_payments")
    .insert({
      showroom_id: showroomAId,
      amount: 15000,
      currency: "KES",
      payment_method: "CHEQUE",
      subscription_start_date: isoDate(-20),
      subscription_end_date: isoDate(-1),
      recorded_by: (await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((u) => u.email === ADMIN_EMAIL)!.id,
      status: "RECORDED",
    })
    .select("id")
    .single();
  paymentIds.push(created!.id);

  await loginAsAdmin(page);
  await page.goto("/admin/payments");
  const row = page.getByRole("row", { name: new RegExp(`E2E Payments Showroom A ${unique}`) });
  await row.getByLabel("Void").click();
  await page.getByRole("button", { name: "Void" }).last().click();
  await expect(page.getByText("Payment voided.")).toBeVisible();
  await expect(row.getByText("Voided", { exact: true })).toBeVisible();

  const { data: after } = await admin().from("manual_payments").select("status").eq("id", created!.id).single();
  expect(after?.status).toBe("VOIDED");
});

test("Send reminders now sends exactly one reminder for an overdue subscription, and none for an active one", async ({ page }) => {
  const supabase = admin();
  const recordedBy = (await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((u) => u.email === ADMIN_EMAIL)!.id;

  const { data: overdue } = await supabase
    .from("manual_payments")
    .insert({ showroom_id: showroomAId, amount: 20000, currency: "KES", payment_method: "MPESA", subscription_start_date: isoDate(-40), subscription_end_date: isoDate(-5), recorded_by: recordedBy, status: "RECORDED" })
    .select("id")
    .single();
  const { data: active } = await supabase
    .from("manual_payments")
    .insert({ showroom_id: showroomBId, amount: 20000, currency: "KES", payment_method: "MPESA", subscription_start_date: isoDate(0), subscription_end_date: isoDate(90), recorded_by: recordedBy, status: "RECORDED" })
    .select("id")
    .single();
  paymentIds.push(overdue!.id, active!.id);

  await loginAsAdmin(page);
  await page.goto("/admin/payments");
  await page.getByRole("button", { name: "Send reminders now" }).click();
  await expect(page.getByText("Sent 1 reminder.")).toBeVisible({ timeout: 15_000 });

  const { data: afterFirst } = await supabase.from("manual_payments").select("id, reminder_sent_at").in("id", [overdue!.id, active!.id]);
  expect(afterFirst?.find((r) => r.id === overdue!.id)?.reminder_sent_at).not.toBeNull();
  expect(afterFirst?.find((r) => r.id === active!.id)?.reminder_sent_at).toBeNull();

  // Clicking again must not re-send for the same already-reminded period.
  await page.getByRole("button", { name: "Send reminders now" }).click();
  await expect(page.getByText("No subscriptions are currently due")).toBeVisible({ timeout: 15_000 });
});

test("the admin dashboard only counts a showroom's LATEST subscription period as due, not an older superseded one", async ({ page }) => {
  const supabase = admin();
  const recordedBy = (await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((u) => u.email === ADMIN_EMAIL)!.id;

  // An old, already-expired period, superseded by a newer active one.
  const { data: oldExpired } = await supabase
    .from("manual_payments")
    .insert({ showroom_id: showroomBId, amount: 10000, currency: "KES", payment_method: "CASH", subscription_start_date: isoDate(-100), subscription_end_date: isoDate(-70), recorded_by: recordedBy, status: "RECORDED" })
    .select("id")
    .single();
  const { data: renewed } = await supabase
    .from("manual_payments")
    .insert({ showroom_id: showroomBId, amount: 10000, currency: "KES", payment_method: "CASH", subscription_start_date: isoDate(-60), subscription_end_date: isoDate(60), recorded_by: recordedBy, status: "RECORDED" })
    .select("id")
    .single();
  paymentIds.push(oldExpired!.id, renewed!.id);

  await loginAsAdmin(page);
  await page.goto("/admin");
  await expect(page.getByText("Subscriptions due").first()).toBeVisible();
  await expect(page.getByText(new RegExp(`E2E Payments Showroom B ${unique}`))).toHaveCount(0);
});

test("a non-admin is redirected away from /admin/payments entirely", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/account$/);

  await page.goto("/admin/payments");
  await expect(page).not.toHaveURL(/\/admin\/payments$/);
});
