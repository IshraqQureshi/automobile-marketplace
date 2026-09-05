import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture accounts (per this repo's convention) — a showroom
// owner (approved) and an admin, each with their own personal-account
// self-service page (/dashboard/account and /admin/profile respectively,
// both backed by the same shared AccountProfileForm/actions in
// src/components/account and src/features/account).
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-account-profile-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-account-profile-owner-fixture-password-123";
const ADMIN_EMAIL = "e2e-account-profile-admin-fixture@harakagari.local";
const ADMIN_PASSWORD = "e2e-account-profile-admin-fixture-password-123";

const MAILPIT_URL = "http://127.0.0.1:54324";

/**
 * Fetches the most recent email sent to `email` from the local Mailpit
 * instance and extracts the first link in its plain-text body — same
 * approach as e2e/auth.spec.ts's own getLatestEmailLink, duplicated here
 * (not imported) since Playwright spec files aren't set up to share
 * helpers across files in this project.
 */
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

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run account-profile E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let ownerId: string;
let adminId: string;
let showroomId: string;

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
    await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    return userId;
  }

  ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);

  const { error: promoteError } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);
  if (promoteError) throw new Error(`Failed to promote admin fixture user: ${promoteError.message}`);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  const { data: showroom, error } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Account Profile Showroom ${Date.now()}`,
      phone: "+254712345678",
      email: "e2e-account-profile-showroom@example.com",
      city: "Nairobi",
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (error || !showroom) throw error ?? new Error("showroom not created");
  showroomId = showroom.id;
});

test.afterAll(async () => {
  await admin().from("showrooms").delete().eq("id", showroomId);
});

async function loginAsFixtureOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");
}

async function loginAsFixtureAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL("**/admin");
}

test("visiting /dashboard/account while signed out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("visiting /admin/profile while signed out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin/profile");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("a showroom owner can update their own name and phone from /dashboard/account", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.getByRole("link", { name: "My Account" }).click();
  await page.waitForURL("**/dashboard/account");

  await page.locator("#account-full-name").fill("E2E Owner Renamed");
  await page.locator("#account-phone").fill("711222333");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();

  await page.reload();
  await expect(page.locator("#account-full-name")).toHaveValue("E2E Owner Renamed");
  await expect(page.locator("#account-phone")).toHaveValue("711222333");

  const { data } = await admin().from("profiles").select("full_name, phone").eq("id", ownerId).single();
  expect(data?.full_name).toBe("E2E Owner Renamed");
  expect(data?.phone).toBe("+254711222333");
});

test("an admin can update their own name and phone from /admin/profile", async ({ page }) => {
  await loginAsFixtureAdmin(page);
  await page.getByRole("link", { name: "My Profile" }).click();
  await page.waitForURL("**/admin/profile");

  await page.locator("#account-full-name").fill("E2E Admin Renamed");
  await page.locator("#account-phone").fill("722333444");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();

  const { data } = await admin().from("profiles").select("full_name, phone").eq("id", adminId).single();
  expect(data?.full_name).toBe("E2E Admin Renamed");
  expect(data?.phone).toBe("+254722333444");
});

test("required fields show inline validation, not a silent no-op", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/account");

  await page.locator("#account-full-name").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Full name is required")).toBeVisible();
  await expect(page.getByText("Profile updated.")).toHaveCount(0);
});

test("a showroom owner can change their password and sign in with the new one", async ({ page }) => {
  const newPassword = "E2eNewOwnerPassword123!";

  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/account");

  await page.locator("#account-new-password").fill(newPassword);
  await page.locator("#account-confirm-password").fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();

  // Must actually sign out first — visiting /login with a still-active
  // session redirects straight to /account instead of showing the form.
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");

  // Restore the fixture's known password so later/rerun tests in this file
  // can still log in with OWNER_PASSWORD.
  await admin().auth.admin.updateUserById(ownerId, { password: OWNER_PASSWORD });
});

test("changing email requires confirming links sent to both the old and new address", async ({ page }) => {
  const newEmail = `e2e-account-profile-owner-new-${Date.now()}@harakagari.local`;

  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/account");

  await page.locator("#account-email").fill(newEmail);
  await page.getByRole("button", { name: "Change email" }).click();
  await expect(page.getByText("Confirmation email sent.")).toBeVisible();

  // supabase/config.toml's double_confirm_changes = true — the change isn't
  // applied until links sent to *both* addresses are clicked.
  const oldAddressLink = await getLatestEmailLink(OWNER_EMAIL);
  await page.goto(oldAddressLink);
  const newAddressLink = await getLatestEmailLink(newEmail);
  await page.goto(newAddressLink);

  const { data } = await admin().auth.admin.getUserById(ownerId);
  expect(data.user?.email).toBe(newEmail);

  // Restore the fixture's known email so later/rerun tests in this file
  // can still log in with OWNER_EMAIL.
  await admin().auth.admin.updateUserById(ownerId, { email: OWNER_EMAIL, email_confirm: true });
});
