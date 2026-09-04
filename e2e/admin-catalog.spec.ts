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

  // A brand's name also appears in the Models section (its brand <select>
  // option and, once a model exists, as that row's meta text) — every
  // lookup here is scoped to the Brands card specifically to avoid
  // colliding with those.
  const brandsCard = page.getByTestId("catalog-list-brands");

  await brandsCard.getByPlaceholder("e.g. Toyota").fill(brandName);
  await brandsCard.getByRole("button", { name: "Add" }).click();
  await expect(brandsCard.locator("li", { hasText: brandName })).toBeAttached();

  await brandsCard.locator("li", { hasText: brandName }).getByRole("button", { name: "Edit" }).click();
  await brandsCard.locator("input:focus").fill(renamedName);
  await brandsCard.getByRole("button", { name: "Save" }).click();
  await expect(brandsCard.locator("li", { hasText: renamedName })).toBeAttached();
  await expect(brandsCard.locator("li", { hasText: brandName })).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await brandsCard.locator("li", { hasText: renamedName }).getByRole("button", { name: "Delete" }).click();
  await expect(brandsCard.locator("li", { hasText: renamedName })).toHaveCount(0);
});

test("admin can add a model under a brand and delete it, without deleting the brand", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Model Brand ${unique}`;
  const modelName = `E2E Model ${unique}`;

  const brandsCard = page.getByTestId("catalog-list-brands");
  const modelsCard = page.getByTestId("catalog-list-models");

  await brandsCard.getByPlaceholder("e.g. Toyota").fill(brandName);
  await brandsCard.getByRole("button", { name: "Add" }).click();
  await expect(brandsCard.locator("li", { hasText: brandName })).toBeAttached();

  await modelsCard.locator("select").selectOption({ label: brandName });
  await modelsCard.getByPlaceholder("e.g. Corolla").fill(modelName);
  await modelsCard.getByRole("button", { name: "Add" }).click();
  await expect(modelsCard.locator("li", { hasText: modelName })).toBeAttached();

  page.once("dialog", (dialog) => dialog.accept());
  await modelsCard.locator("li", { hasText: modelName }).getByRole("button", { name: "Delete" }).click();
  await expect(modelsCard.locator("li", { hasText: modelName })).toHaveCount(0);
  // The brand itself must survive deleting one of its models.
  await expect(brandsCard.locator("li", { hasText: brandName })).toBeAttached();

  page.once("dialog", (dialog) => dialog.accept());
  await brandsCard.locator("li", { hasText: brandName }).getByRole("button", { name: "Delete" }).click();
});

test("deleting a brand also removes its models", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Cascade Brand ${unique}`;
  const modelName = `E2E Cascade Model ${unique}`;

  const brandsCard = page.getByTestId("catalog-list-brands");
  const modelsCard = page.getByTestId("catalog-list-models");

  await brandsCard.getByPlaceholder("e.g. Toyota").fill(brandName);
  await brandsCard.getByRole("button", { name: "Add" }).click();
  await expect(brandsCard.locator("li", { hasText: brandName })).toBeAttached();

  await modelsCard.locator("select").selectOption({ label: brandName });
  await modelsCard.getByPlaceholder("e.g. Corolla").fill(modelName);
  await modelsCard.getByRole("button", { name: "Add" }).click();
  await expect(modelsCard.locator("li", { hasText: modelName })).toBeAttached();

  page.once("dialog", (dialog) => dialog.accept());
  await brandsCard.locator("li", { hasText: brandName }).getByRole("button", { name: "Delete" }).click();
  await expect(brandsCard.locator("li", { hasText: brandName })).toHaveCount(0);
  await expect(modelsCard.locator("li", { hasText: modelName })).toHaveCount(0);
});

test("admin can create and delete a vehicle type", async ({ page }) => {
  const unique = Date.now();
  const typeName = `E2E Type ${unique}`;

  const typesCard = page.getByTestId("catalog-list-types");

  await typesCard.getByPlaceholder("e.g. Sedan").fill(typeName);
  await typesCard.getByRole("button", { name: "Add" }).click();
  await expect(typesCard.locator("li", { hasText: typeName })).toBeAttached();

  page.once("dialog", (dialog) => dialog.accept());
  await typesCard.locator("li", { hasText: typeName }).getByRole("button", { name: "Delete" }).click();
  await expect(typesCard.locator("li", { hasText: typeName })).toHaveCount(0);
});

test("admin can upload a brand logo, replace it, and remove it", async ({ page }) => {
  const unique = Date.now();
  const brandName = `E2E Logo Brand ${unique}`;

  const brandsCard = page.getByTestId("catalog-list-brands");

  await brandsCard.getByPlaceholder("e.g. Toyota").fill(brandName);
  await brandsCard.getByLabel("Logo").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a real png, just proving the upload path"),
  });
  await brandsCard.getByRole("button", { name: "Add" }).click();

  const row = brandsCard.locator("li", { hasText: brandName });
  await expect(row).toBeAttached();
  await expect(row.getByRole("img", { name: `${brandName} logo` })).toBeAttached();

  // Replace the logo with a different file.
  await row.getByRole("button", { name: "Edit" }).click();
  await brandsCard.getByLabel("Replace logo").setInputFiles({
    name: "logo-2.png",
    mimeType: "image/png",
    buffer: Buffer.from("a different fake png"),
  });
  await brandsCard.getByRole("button", { name: "Save" }).click();
  await expect(row.getByRole("img", { name: `${brandName} logo` })).toBeAttached();

  // Remove the logo entirely — the row falls back to the initial-letter badge.
  await row.getByRole("button", { name: "Edit" }).click();
  await brandsCard.getByLabel("Remove logo").check();
  await brandsCard.getByRole("button", { name: "Save" }).click();
  await expect(row.getByRole("img", { name: `${brandName} logo` })).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Delete" }).click();
});

test("rejects a duplicate brand name with an inline error, not a crash", async ({ page }) => {
  const brandsCard = page.getByTestId("catalog-list-brands");
  await brandsCard.getByPlaceholder("e.g. Toyota").fill("Toyota");
  await brandsCard.getByRole("button", { name: "Add" }).click();
  await expect(brandsCard.getByText(/already exists/i)).toBeVisible();
});
