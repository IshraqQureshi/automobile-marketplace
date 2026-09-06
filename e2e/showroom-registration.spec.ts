import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// All tests here share one fixture customer account and mutate the same
// showrooms row (afterEach deletes whatever that account owns), so they
// can't run fullyParallel (the project default) without racing each
// other — force this file to run its tests one at a time instead.
test.describe.configure({ mode: "serial" });

// Dedicated E2E fixture customer (force-created/confirmed via the
// service-role client, same pattern as admin-catalog.spec.ts) so this file
// doesn't depend on the real registration/email-confirmation flow, which is
// already covered by auth.spec.ts.
const CUSTOMER_EMAIL = "e2e-showroom-fixture@harakagari.local";
const CUSTOMER_PASSWORD = "e2e-showroom-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run showroom-registration E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let customerId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser() {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === CUSTOMER_EMAIL);
  }

  let userId = (await findFixtureUser())?.id;
  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: CUSTOMER_EMAIL,
      password: CUSTOMER_PASSWORD,
      email_confirm: true,
    });
    if (created.user) {
      userId = created.user.id;
    } else {
      userId = (await findFixtureUser())?.id;
      if (!userId) throw new Error(`Failed to create showroom fixture user: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(userId, { password: CUSTOMER_PASSWORD });
  customerId = userId;
});

test.afterEach(async () => {
  // Clean up between tests — showrooms_owner_user_id_active_unique allows
  // only one PENDING/APPROVED/SUSPENDED showroom per owner, so a prior
  // test's registration would otherwise block the next one.
  await admin().from("showrooms").delete().eq("owner_user_id", customerId);
});

async function loginAsFixtureCustomer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  // Usually /account — but once this fixture owns a showroom (the "second
  // registration attempt" test below registers one mid-suite before logging
  // in again), signInAction now sends a showroom owner to /dashboard
  // instead (see src/features/auth/actions.ts). Every test here navigates
  // to wherever it actually needs next regardless, so accept either.
  await page.waitForURL(/\/(account|dashboard)$/);
}

test("visiting /register-showroom while signed out redirects to /login", async ({ page }) => {
  await page.goto("/register-showroom");
  await expect(page).toHaveURL(/\/login$/);
});

test("the header's 'Sell your car' link leads to the ready-to-sell chooser, which links to registration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sell your car" }).click();
  await expect(page).toHaveURL(/\/ready-to-sell$/);

  // "Register Now →" is the Showroom card's real link; the Individual
  // Seller card's disabled button reads "Register Now — Coming soon", so
  // this name is unambiguous.
  await page.getByRole("link", { name: "Register Now →" }).click();
  await expect(page).toHaveURL(/\/register-showroom$/);
});

test("signed-in customer can submit a showroom registration and sees a pending confirmation", async ({ page }) => {
  await loginAsFixtureCustomer(page);
  await page.goto("/register-showroom");

  const unique = Date.now();
  await page.getByLabel("Owner full name").fill(`E2E Owner ${unique}`);
  await page.getByLabel("Business name").fill(`E2E Motors ${unique}`);
  await page.locator("#documents").setInputFiles({
    name: "license.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test document"),
  });
  await page.getByLabel("Location").fill("Westlands, Nairobi");
  await page.getByLabel("Business phone").fill("712345678");
  await page.getByLabel("Business email").fill(`showroom-${unique}@example.com`);

  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();

  // The applicant's account name is kept in sync with what they confirmed
  // here — same real-world fact, one source of truth (profiles.full_name).
  const { data: updatedProfile } = await admin().from("profiles").select("full_name").eq("id", customerId).single();
  expect(updatedProfile?.full_name).toBe(`E2E Owner ${unique}`);

  // Confirm the upload actually persisted (not just that the UI said so) —
  // a real showroom_documents row referencing the uploaded file.
  const { data: showroom } = await admin().from("showrooms").select("id").eq("owner_user_id", customerId).single();
  const { data: documents } = await admin().from("showroom_documents").select("document_type, storage_path").eq("showroom_id", showroom!.id);
  expect(documents).toHaveLength(1);
  expect(documents?.[0]?.document_type).toBe("business_registration");
  expect(documents?.[0]?.storage_path).toContain("license.pdf");

  // Revisiting the page now shows the pending-review status instead of the
  // form — one active showroom per owner is enforced.
  await page.goto("/register-showroom");
  await expect(page.getByRole("heading", { name: "Application pending review" })).toBeVisible();
});

test("submitting without a document shows a clear error, not a crash", async ({ page }) => {
  await loginAsFixtureCustomer(page);
  await page.goto("/register-showroom");

  const unique = Date.now();
  await page.getByLabel("Owner full name").fill(`E2E Owner ${unique}`);
  await page.getByLabel("Business name").fill(`E2E Motors ${unique}`);
  await page.getByLabel("Location").fill("Westlands, Nairobi");
  await page.getByLabel("Business phone").fill("712345678");
  await page.getByLabel("Business email").fill(`showroom-${unique}@example.com`);

  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText(/upload at least one/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Application submitted" })).toHaveCount(0);
});

test("a second registration attempt while one is pending shows the pending status instead of a form", async ({ page }) => {
  await admin()
    .from("showrooms")
    .insert({
      owner_user_id: customerId,
      business_name: "Already Registered Motors",
      phone: "+254712345678",
      email: "already-registered@example.com",
      city: "Nairobi",
    });

  await loginAsFixtureCustomer(page);
  await page.goto("/register-showroom");

  await expect(page.getByRole("heading", { name: "Application pending review" })).toBeVisible();
  await expect(page.getByLabel("Business name")).toHaveCount(0);
});
