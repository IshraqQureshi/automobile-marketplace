import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Same fixture-account pattern as admin-auth.spec.ts — a dedicated E2E
// fixture, not the real seed-admin.mjs account, force-created/reset via the
// service-role client so it doesn't depend on prior local-dev state.
//
// Uses its own email (distinct from admin-auth.spec.ts's fixture) because
// Playwright runs spec files concurrently in separate workers: if both
// files' beforeAll reset the password on the *same* account, a reset from
// one file can invalidate a session the other file just logged in with.
//
// Also runs serially (mode: "serial" below) for the same reason: under the
// project's fullyParallel default, this file's own tests can be spread
// across more than one worker, and beforeAll runs once per worker that
// picks up a test from this file — two concurrent beforeAll calls
// resetting the *same* account's password can race each other's logins,
// exactly like the cross-file case above but within one file.
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = "e2e-admin-catalog-fixture@harakagari.local";
const ADMIN_PASSWORD = "e2e-admin-catalog-fixture-password-123";

test.beforeAll(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run admin-catalog E2E tests");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

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
      userId = (await findFixtureUser())?.id;
      if (!userId) throw new Error(`Failed to create admin fixture user: ${error?.message}`);
    }
  }

  await admin.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });

  const { error: promoteError } = await admin.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (promoteError) throw new Error(`Failed to promote admin fixture user: ${promoteError.message}`);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/catalog");
  await page.getByRole("heading", { name: "Brands" }).waitFor();
});

test("visiting /admin/catalog while signed out redirects to /admin/login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/admin/catalog");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin can create, rename, and delete a brand", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Brand ${unique}`;
  const renamedName = `E2E Brand Renamed ${unique}`;

  await page.getByRole("button", { name: "New Brand" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(brandName);
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Brand created.")).toBeVisible();

  const row = page.getByRole("row", { name: brandName });
  await expect(row).toBeAttached();

  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(renamedName);
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Brand updated.")).toBeVisible();

  const renamedRow = page.getByRole("row", { name: renamedName });
  await expect(renamedRow).toBeAttached();
  await expect(page.getByRole("row", { name: brandName, exact: true })).toHaveCount(0);

  await renamedRow.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Brand deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: renamedName })).toHaveCount(0);
});

test("rejects an empty brand name client-side, without ever reaching the server", async ({ page }) => {
  await page.getByRole("button", { name: "New Brand" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("");
  await dialog.getByRole("button", { name: "Create" }).click();
  // A real, styled application error — not the browser's native "required"
  // tooltip, which this form deliberately opts out of (noValidate) so this
  // message is the only thing a user ever sees.
  await expect(dialog.getByText("Name is required").first()).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Brand created.")).toHaveCount(0);
});

test("admin can add a model under a brand and delete it, without deleting the brand", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Model Brand ${unique}`;
  const modelName = `E2E Model ${unique}`;

  await page.getByRole("button", { name: "New Brand" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(brandName);
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Brand created.")).toBeVisible();

  await page.getByRole("tab", { name: /Models/ }).click();
  await page.getByRole("button", { name: "New Model" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Brand").selectOption({ label: brandName });
  await createDialog.getByLabel("Name").fill(modelName);
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Model created.")).toBeVisible();

  const modelRow = page.getByRole("row", { name: modelName });
  await expect(modelRow).toBeAttached();

  await modelRow.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Model deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: modelName })).toHaveCount(0);

  // The brand itself must survive deleting one of its models.
  await page.getByRole("tab", { name: /Brands/ }).click();
  const brandRow = page.getByRole("row", { name: brandName });
  await expect(brandRow).toBeAttached();

  await brandRow.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Brand deleted.")).toBeVisible();
});

test("deleting a brand also removes its models", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Cascade Brand ${unique}`;
  const modelName = `E2E Cascade Model ${unique}`;

  await page.getByRole("button", { name: "New Brand" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(brandName);
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Brand created.")).toBeVisible();

  await page.getByRole("tab", { name: /Models/ }).click();
  await page.getByRole("button", { name: "New Model" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Brand").selectOption({ label: brandName });
  await createDialog.getByLabel("Name").fill(modelName);
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Model created.")).toBeVisible();
  await expect(page.getByRole("row", { name: modelName })).toBeAttached();

  await page.getByRole("tab", { name: /Brands/ }).click();
  await page.getByRole("row", { name: brandName }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Brand deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: brandName })).toHaveCount(0);

  await page.getByRole("tab", { name: /Models/ }).click();
  await expect(page.getByRole("row", { name: modelName })).toHaveCount(0);
});

test("admin can create and delete a vehicle type", async ({ page }) => {
  const unique = Date.now();
  const typeName = `E2E Type ${unique}`;

  await page.getByRole("tab", { name: /Types/ }).click();
  await page.getByRole("button", { name: "New Type" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(typeName);
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Type created.")).toBeVisible();

  const row = page.getByRole("row", { name: typeName });
  await expect(row).toBeAttached();

  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Type deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: typeName })).toHaveCount(0);
});

test("rejects an empty vehicle type name client-side, without ever reaching the server", async ({ page }) => {
  await page.getByRole("tab", { name: /Types/ }).click();
  await page.getByRole("button", { name: "New Type" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText("Name is required").first()).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Type created.")).toHaveCount(0);
});

test("admin can upload a brand logo, replace it, and remove it", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Logo Brand ${unique}`;

  await page.getByRole("button", { name: "New Brand" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(brandName);
  await page.getByRole("dialog").getByLabel("Logo", { exact: true }).setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a real png, just proving the upload path"),
  });
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Brand created.")).toBeVisible();

  const row = page.getByRole("row", { name: brandName });
  await expect(row).toBeAttached();
  await expect(row.getByRole("img", { name: `${brandName} logo` })).toBeAttached();

  // Replace the logo with a different file.
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Logo", { exact: true }).setInputFiles({
    name: "logo-2.png",
    mimeType: "image/png",
    buffer: Buffer.from("a different fake png"),
  });
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Brand updated.")).toBeVisible();
  await expect(row.getByRole("img", { name: `${brandName} logo` })).toBeAttached();

  // Remove the logo entirely — the row falls back to the initial-letter avatar.
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Remove current logo").check();
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Brand updated.")).toBeVisible();
  await expect(row.getByRole("img", { name: `${brandName} logo` })).toHaveCount(0);

  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Brand deleted.")).toBeVisible();
});

test("rejects a duplicate brand name with an inline error, not a crash", async ({ page }) => {
  await page.getByRole("button", { name: "New Brand" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Toyota");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText(/already exists/i)).toBeVisible();
});
