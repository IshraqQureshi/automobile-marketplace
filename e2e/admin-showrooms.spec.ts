import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Same fixture-account + serial-execution reasoning as admin-catalog.spec.ts
// — its own dedicated fixture email (distinct from other admin spec files'
// fixtures) and mode: "serial" to avoid two workers' beforeAll calls racing
// each other's password reset on the same account.
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = "e2e-admin-showrooms-fixture@harakagari.local";
const ADMIN_PASSWORD = "e2e-admin-showrooms-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run admin-showrooms E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let ownerUserId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser(email: string) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === email);
  }

  let userId = (await findFixtureUser(ADMIN_EMAIL))?.id;
  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
    if (created.user) {
      userId = created.user.id;
    } else {
      userId = (await findFixtureUser(ADMIN_EMAIL))?.id;
      if (!userId) throw new Error(`Failed to create admin fixture user: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
  const { error: promoteError } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (promoteError) throw new Error(`Failed to promote admin fixture user: ${promoteError.message}`);

  // A single reusable "showroom owner" fixture — showrooms created for it
  // are cleaned up after each test, not the user itself, per showroom.spec.ts.
  const ownerEmail = "e2e-showroom-owner-fixture@harakagari.local";
  let existingOwnerId = (await findFixtureUser(ownerEmail))?.id;
  if (!existingOwnerId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: ownerEmail, password: "not-used-directly-123", email_confirm: true });
    if (created.user) {
      existingOwnerId = created.user.id;
    } else {
      existingOwnerId = (await findFixtureUser(ownerEmail))?.id;
      if (!existingOwnerId) throw new Error(`Failed to create showroom owner fixture: ${error?.message}`);
    }
  }
  ownerUserId = existingOwnerId;
});

test.afterEach(async () => {
  await admin().from("showrooms").delete().eq("owner_user_id", ownerUserId);
});

async function loginAsFixtureAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL("**/admin");
}

async function createPendingShowroom(businessName: string, withDocument = false) {
  const supabase = admin();
  const { data: showroom, error } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerUserId,
      business_name: businessName,
      phone: "+254712345678",
      email: `${businessName.toLowerCase().replace(/\s+/g, "-")}@example.com`,
      city: "Nairobi",
    })
    .select()
    .single();
  if (error || !showroom) throw error ?? new Error("showroom not created");

  if (withDocument) {
    const path = `${showroom.id}/license.pdf`;
    await supabase.storage.from("showroom-documents").upload(path, new Blob(["fake pdf"], { type: "application/pdf" }), { upsert: true });
    await supabase.from("showroom_documents").insert({
      showroom_id: showroom.id,
      document_type: "business_registration",
      storage_path: path,
      uploaded_by: ownerUserId,
    });
  }

  return showroom.id as string;
}

test("visiting /admin/showrooms while signed out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin/showrooms");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin can review a pending showroom, view its document, and approve it", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Showroom ${unique}`;
  await createPendingShowroom(businessName, true);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await expect(row).toBeAttached();
  await expect(row.getByText("Pending")).toBeVisible();

  await row.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Business Registration")).toBeVisible();

  const [docPage] = await Promise.all([page.context().waitForEvent("page"), dialog.getByRole("button", { name: "View", exact: true }).click()]);
  await docPage.close();

  await dialog.getByRole("button", { name: "Approve" }).click();
  await dialog.getByRole("button", { name: "Yes, approve" }).click();
  await expect(page.getByText(`${businessName} approved.`)).toBeVisible();
  await expect(page.getByRole("row", { name: businessName }).getByText("Approved")).toBeVisible();
});

test("admin can reject a pending showroom", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Reject Showroom ${unique}`;
  await createPendingShowroom(businessName);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await row.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Reject" }).click();
  await dialog.getByRole("button", { name: "Yes, reject" }).click();
  await expect(page.getByText(`${businessName} rejected.`)).toBeVisible();
  await expect(page.getByRole("row", { name: businessName }).getByText("Rejected")).toBeVisible();
});

test("an approved or rejected showroom has no approve/reject actions in its review dialog", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Approved Showroom ${unique}`;
  const showroomId = await createPendingShowroom(businessName);
  await admin().from("showrooms").update({ status: "APPROVED", verified: true }).eq("id", showroomId);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await row.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Reject" })).toHaveCount(0);
});
