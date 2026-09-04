import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const MAILPIT_URL = "http://127.0.0.1:54324";

// A fixture account, not the real seed-admin.mjs account — the local
// Supabase stack's persisted state (and this file's own password resets in
// earlier test runs) can drift across runs, so depending on a specific
// pre-existing password would be flaky. beforeAll below creates or
// force-resets this account directly via the service-role client instead.
const ADMIN_EMAIL = "e2e-admin-fixture@harakagari.local";
const ADMIN_PASSWORD = "e2e-admin-fixture-password-123";

test.beforeAll(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run admin-auth E2E tests");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Playwright's fullyParallel mode can run this same beforeAll concurrently
  // across multiple workers (each worker that picks up a test from this
  // file runs it once) — so creation must tolerate losing a race to another
  // worker creating the same fixture email first, rather than treating that
  // as a real failure.
  async function findFixtureUser() {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === ADMIN_EMAIL);
  }

  let userId = (await findFixtureUser())?.id;

  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (created.user) {
      userId = created.user.id;
    } else {
      // Lost the race to another worker — it should exist now.
      userId = (await findFixtureUser())?.id;
      if (!userId) throw new Error(`Failed to create admin fixture user: ${error?.message}`);
    }
  }

  await admin.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });

  const { error: promoteError } = await admin.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (promoteError) throw new Error(`Failed to promote admin fixture user: ${promoteError.message}`);
});

async function getLatestEmailLink(email: string): Promise<string> {
  const searchRes = await fetch(`${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(email)}`);
  const search = await searchRes.json();
  const latest = search.messages?.[0];
  if (!latest) throw new Error(`No email found for ${email}`);

  const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
  const msg = await msgRes.json();
  const match = (msg.Text as string).match(/\(\s*(http\S+)\s*\)/);
  const link = match?.[1];
  if (!link) throw new Error(`No link found in email body: ${msg.Text}`);
  return link;
}

async function registerAndConfirmCustomer(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("Admin Login E2E");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/check your email to confirm/i)).toBeVisible();
  await page.goto(await getLatestEmailLink(email));
  await expect(page).toHaveURL(/\/account$/);
}

test("admin can log in via /admin/login and reach /admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(ADMIN_EMAIL, { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("visiting /admin while signed out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin credentials are rejected on the customer/showroom login and no session is created", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();

  // Same generic message as any other failed login — this page must not
  // confirm that the credentials belong to a real admin account.
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  // No session should have been left behind by the rejected attempt.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("a customer's credentials are rejected on the admin login, and their normal login still works", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `e2e-admin-reject-${unique}@example.com`;
  const password = "test-password-123";

  await registerAndConfirmCustomer(page, email, password);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to admin" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);

  // The rejected admin-login attempt must not have left the customer signed
  // into their own account either (adminSignInAction signs back out).
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);

  // Their real login still works normally.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await expect(page).toHaveURL(/\/account$/);
});
