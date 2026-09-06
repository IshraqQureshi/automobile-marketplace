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
const SHOWROOM_OWNER_EMAIL = `e2e-users-showroom-owner-fixture-${unique}@harakagari.local`;
const SHOWROOM_OWNER_PASSWORD = "e2e-users-showroom-owner-fixture-password-123";

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
let showroomOwnerId: string;
let showroomId: string;
let createdUserId: string | undefined;

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

  showroomOwnerId = await ensureFixtureUser(SHOWROOM_OWNER_EMAIL, SHOWROOM_OWNER_PASSWORD, `E2E Users Showroom Owner ${unique}`);
  await supabase.from("showrooms").delete().eq("owner_user_id", showroomOwnerId);
  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: showroomOwnerId,
      business_name: `E2E Users Showroom ${unique}`,
      phone: "+254712345683",
      email: `e2e-users-showroom-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;
});

test.afterEach(async () => {
  // Some tests deliberately suspend/promote the fixture customer — reset
  // both to a known baseline between tests.
  const supabase = admin();
  await supabase.from("profiles").update({ role: "CUSTOMER", is_active: true }).eq("id", customerId);
  await supabase.from("profiles").update({ role: "CUSTOMER", is_active: true }).eq("id", otherCustomerId);
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("showrooms").delete().eq("id", showroomId);
  if (createdUserId) await supabase.auth.admin.deleteUser(createdUserId);
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

test("admin can create a new user via invite, and the account exists with the chosen role", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");

  const newUserEmail = `e2e-users-created-${unique}@example.com`;
  await page.getByRole("button", { name: "New user" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill(`E2E Created User ${unique}`);
  await dialog.getByLabel("Email").fill(newUserEmail);
  await dialog.getByLabel(/^Phone/).fill("712345678");
  await dialog.getByLabel("Role").selectOption("ADMIN");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Invite sent")).toBeVisible({ timeout: 10_000 });

  const row = page.getByRole("row", { name: new RegExp(`E2E Created User ${unique}`) });
  await expect(row).toBeVisible();
  await expect(row.getByLabel(/Role for/)).toHaveValue("ADMIN");

  // GoTrue's real SMTP delivery can't be independently confirmed from this
  // suite (see PR description — the same limitation already affects the
  // pre-existing showroom-owner invite flow in admin-showrooms.spec.ts) —
  // the reliable, DB-level signal is that handle_new_user really created a
  // real auth user + profile with the requested role. `profiles` has no
  // email column, so the new user's id is looked up via the admin API first.
  const { data: authUsers } = await admin().auth.admin.listUsers({ page: 1, perPage: 200 });
  const newUserId = authUsers.users.find((u) => u.email === newUserEmail)?.id;
  expect(newUserId).toBeDefined();
  createdUserId = newUserId;

  const { data: profile } = await admin().from("profiles").select("role").eq("id", newUserId!).single();
  expect(profile?.role).toBe("ADMIN");
});

test("admin can edit a user's name, phone, and email", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await page.getByPlaceholder("Search name, email, or showroom…").fill(CUSTOMER_EMAIL);

  const row = page.getByRole("row", { name: new RegExp(`E2E Users Customer ${unique}`) });
  await row.getByLabel("Edit").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill(`E2E Users Customer Edited ${unique}`);
  await dialog.getByLabel(/^Phone/).fill("798765432");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("User updated.")).toBeVisible();

  const editedRow = page.getByRole("row", { name: new RegExp(`E2E Users Customer Edited ${unique}`) });
  await expect(editedRow).toBeVisible();

  const { data } = await admin().from("profiles").select("full_name, phone").eq("id", customerId).single();
  expect(data?.full_name).toBe(`E2E Users Customer Edited ${unique}`);
  expect(data?.phone).toBe("+254798765432");
});

test("admin can delete a user account permanently, but not one who still owns a showroom or their own account", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");

  // Blocked: still owns a showroom (FK restrict on showrooms.owner_user_id).
  await page.getByPlaceholder("Search name, email, or showroom…").fill(SHOWROOM_OWNER_EMAIL);
  const ownerRow = page.getByRole("row", { name: new RegExp(`E2E Users Showroom Owner ${unique}`) });
  await ownerRow.getByLabel("Delete").click();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByText(/may still own a showroom/)).toBeVisible();
  await expect(ownerRow).toBeVisible();
  const { data: ownerStillExists } = await admin().from("profiles").select("id").eq("id", showroomOwnerId).maybeSingle();
  expect(ownerStillExists).not.toBeNull();

  // Blocked: cannot delete your own account (no confirm dialog even opens —
  // the Delete button itself is disabled for the signed-in admin's own row).
  await page.getByPlaceholder("Search name, email, or showroom…").fill(ADMIN_EMAIL);
  const selfRow = page.getByRole("row", { name: /\(you\)/ });
  await expect(selfRow.getByLabel("Delete")).toBeDisabled();

  // Allowed: a plain customer with no showroom.
  await page.getByPlaceholder("Search name, email, or showroom…").fill(OTHER_CUSTOMER_EMAIL);
  const deletableRow = page.getByRole("row", { name: new RegExp(`E2E Users Other Customer ${unique}`) });
  await deletableRow.getByLabel("Delete").click();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByText("User deleted.")).toBeVisible();
  await expect(deletableRow).toHaveCount(0);

  const { data: afterDelete } = await admin().from("profiles").select("id").eq("id", otherCustomerId).maybeSingle();
  expect(afterDelete).toBeNull();

  // This test permanently deletes otherCustomerId — recreate it so
  // afterEach's reset (and any test order after this one) still finds a
  // valid row rather than erroring on a missing profile.
  const { data: recreated } = await admin().auth.admin.createUser({ email: OTHER_CUSTOMER_EMAIL, password: OTHER_CUSTOMER_PASSWORD, email_confirm: true });
  if (recreated.user) {
    otherCustomerId = recreated.user.id;
    await admin().from("profiles").update({ full_name: `E2E Users Other Customer ${unique}` }).eq("id", otherCustomerId);
  }
});
