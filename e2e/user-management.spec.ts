import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ADM-003 (User Management). Own dedicated fixture admin + customers (per
// this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const ADMIN_EMAIL = `e2e-users-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-users-admin-fixture-password-123";
const CUSTOMER_EMAIL = `e2e-users-customer-fixture-${unique}@example.com`;
const CUSTOMER_PASSWORD = "e2e-users-customer-fixture-password-123";
const OTHER_CUSTOMER_EMAIL = `e2e-users-other-customer-fixture-${unique}@example.com`;
const OTHER_CUSTOMER_PASSWORD = "e2e-users-other-customer-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run user-management E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let customerId: string;
let otherCustomerId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function ensureFixtureUser(email: string, password: string, fullName: string): Promise<string> {
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
    await supabase.from("profiles").update({ role: "CUSTOMER", is_active: true, full_name: fullName }).eq("id", userId);
    return userId;
  }

  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD, "E2E Users Admin");
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  customerId = await ensureFixtureUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD, `E2E Users Customer ${unique}`);
  otherCustomerId = await ensureFixtureUser(OTHER_CUSTOMER_EMAIL, OTHER_CUSTOMER_PASSWORD, `E2E Users Other Customer ${unique}`);
});

test.afterEach(async () => {
  // Some tests deliberately suspend/promote the fixture customer — reset
  // both to a known baseline between tests.
  const supabase = admin();
  await supabase.from("profiles").update({ role: "CUSTOMER", is_active: true }).eq("id", customerId);
  await supabase.from("profiles").update({ role: "CUSTOMER", is_active: true }).eq("id", otherCustomerId);
});

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);
}

test("admin sees every user, and search + role + status filters narrow the list", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");

  await expect(page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) })).toBeVisible();

  await page.getByPlaceholder("Search name, email, or showroom…").fill(CUSTOMER_EMAIL);
  await expect(page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`E2E Users Other Customer ${unique}`) })).toHaveCount(0);
  await page.getByPlaceholder("Search name, email, or showroom…").fill("");

  await page.getByLabel("Filter by role").selectOption("ADMIN");
  await expect(page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) })).toHaveCount(0);
  await page.getByLabel("Filter by role").selectOption("ALL");

  await page.getByLabel("Filter by status").selectOption("SUSPENDED");
  await expect(page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) })).toHaveCount(0);
});

test("admin can suspend a user, blocking their login, then reactivate them", async ({ page, browser }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await page.getByPlaceholder("Search name, email, or showroom…").fill(CUSTOMER_EMAIL);

  const row = page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) });
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByRole("button", { name: "Suspend" }).last().click();
  await expect(page.getByText("Account suspended.")).toBeVisible();
  await expect(row.getByText("Suspended")).toBeVisible();

  const { data: afterSuspend } = await admin().from("profiles").select("is_active").eq("id", customerId).single();
  expect(afterSuspend?.is_active).toBe(false);

  const suspendedContext = await browser.newContext();
  const suspendedPage = await suspendedContext.newPage();
  await suspendedPage.goto("/login");
  await suspendedPage.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await suspendedPage.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await suspendedPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await expect(suspendedPage.getByText("This account has been suspended. Contact support for help.")).toBeVisible();
  await expect(suspendedPage).toHaveURL(/\/login$/);
  await suspendedContext.close();

  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByText("Account reactivated.")).toBeVisible();
  await expect(row.getByText("Active")).toBeVisible();

  const reactivatedContext = await browser.newContext();
  const reactivatedPage = await reactivatedContext.newPage();
  await reactivatedPage.goto("/login");
  await reactivatedPage.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await reactivatedPage.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await reactivatedPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await reactivatedPage.waitForURL(/\/account$/);
  await reactivatedContext.close();
});

test("admin can promote a customer to admin, and that user can then access the admin panel", async ({ page, browser }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await page.getByPlaceholder("Search name, email, or showroom…").fill(CUSTOMER_EMAIL);

  const row = page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) });
  await expect(async () => {
    await row.getByLabel(/Role for/).selectOption("ADMIN");
    await expect(row.getByLabel(/Role for/)).toHaveValue("ADMIN");
  }).toPass({ timeout: 10_000 });
  await expect(page.getByText("Role updated to admin.")).toBeVisible();

  const { data } = await admin().from("profiles").select("role").eq("id", customerId).single();
  expect(data?.role).toBe("ADMIN");

  const promotedContext = await browser.newContext();
  const promotedPage = await promotedContext.newPage();
  await promotedPage.goto("/admin/login");
  await promotedPage.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await promotedPage.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await promotedPage.getByRole("button", { name: "Sign in to admin" }).click();
  await promotedPage.waitForURL(/\/admin$/);
  await promotedContext.close();
});

test("an admin cannot suspend or change the role of their own account — the controls are disabled", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await page.getByPlaceholder("Search name, email, or showroom…").fill(ADMIN_EMAIL);

  const row = page.getByRole("row", { name: /\(you\)/ });
  await expect(row).toBeVisible();
  await expect(row.getByLabel(/Role for/)).toBeDisabled();
  await expect(row.getByRole("button", { name: "Suspend" })).toBeDisabled();
});

test("a non-admin is redirected away from /admin/users entirely", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OTHER_CUSTOMER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OTHER_CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/account$/);

  await page.goto("/admin/users");
  await expect(page).not.toHaveURL(/\/admin\/users$/);
});
