import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture accounts (per this repo's convention — see
// e2e/dashboard-vehicles.spec.ts's own note on this) rather than reusing
// another spec's fixture, since this spec creates/mutates its own showroom
// row directly via the admin client between tests.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-dashboard-profile-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-dashboard-profile-owner-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run dashboard-profile E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// A real (tiny, 1x1) PNG rather than a text fixture masquerading as an
// image — same reasoning as TINY_PNG_BASE64 in e2e/dashboard-vehicles.spec.ts.
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let ownerId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser(email: string) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === email);
  }

  let userId = (await findFixtureUser(OWNER_EMAIL))?.id;
  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: OWNER_EMAIL, password: OWNER_PASSWORD, email_confirm: true });
    if (created.user) {
      userId = created.user.id;
    } else {
      userId = (await findFixtureUser(OWNER_EMAIL))?.id;
      if (!userId) throw new Error(`Failed to create fixture user: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(userId, { password: OWNER_PASSWORD });
  ownerId = userId;
});

test.beforeEach(async () => {
  const supabase = admin();
  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  await supabase.from("showrooms").insert({
    owner_user_id: ownerId,
    business_name: "E2E Profile Fixture Showroom",
    phone: "+254712345678",
    email: "e2e-dashboard-profile-showroom@example.com",
    city: "Nairobi",
    address: "100 Fixture Road",
    description: "Original description.",
    status: "APPROVED",
    verified: true,
  });
});

test.afterAll(async () => {
  await admin().from("showrooms").delete().eq("owner_user_id", ownerId);
});

async function loginAsFixtureOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");
}

test("the dashboard sidebar links to the profile page, and it's pre-filled with the real showroom data", async ({ page }) => {
  await loginAsFixtureOwner(page);
  // exact:true — the redesigned dashboard landing page (src/app/dashboard/page.tsx)
  // also has an "Edit showroom profile" quick-action link, which a
  // substring match on "Profile" would otherwise also resolve to.
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.waitForURL("**/dashboard/profile");

  await expect(page.locator("#showroom-business-name")).toHaveValue("E2E Profile Fixture Showroom");
  await expect(page.locator("#showroom-location")).toHaveValue("Nairobi");
  await expect(page.locator("#showroom-phone")).toHaveValue("712345678");
  await expect(page.locator("#showroom-email")).toHaveValue("e2e-dashboard-profile-showroom@example.com");
  await expect(page.locator("#showroom-address")).toHaveValue("100 Fixture Road");
  await expect(page.locator("#showroom-description")).toHaveValue("Original description.");
});

test("editing and saving the profile persists, and the sidebar reflects the new business name", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/profile");

  await page.locator("#showroom-business-name").fill("Renamed Showroom");
  await page.locator("#showroom-location").fill("Mombasa");
  await page.locator("#showroom-address").fill("200 New Address");
  await page.locator("#showroom-description").fill("Updated description.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Showroom profile updated.")).toBeVisible();

  // The sidebar (a different Server Component than the form) should also
  // reflect the new name without a manual reload.
  await expect(page.getByText("Renamed Showroom")).toBeVisible();

  await page.reload();
  await expect(page.locator("#showroom-business-name")).toHaveValue("Renamed Showroom");
  await expect(page.locator("#showroom-location")).toHaveValue("Mombasa");
  await expect(page.locator("#showroom-address")).toHaveValue("200 New Address");
  await expect(page.locator("#showroom-description")).toHaveValue("Updated description.");
});

test("required fields show one inline validation message, not a duplicate banner", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/profile");

  await expect(page.getByText("Business name is required")).toHaveCount(0);
  await page.locator("#showroom-business-name").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Business name is required")).toHaveCount(1);
  await expect(page.getByText("Showroom profile updated.")).toHaveCount(0);
});

test("a showroom owner can upload, then remove, their logo", async ({ page }) => {
  await loginAsFixtureOwner(page);
  await page.goto("/dashboard/profile");

  // This file input is present in the very first paint of a freshly loaded
  // page — same hydration-race window as the Deposit type / Status
  // <select>s in e2e/dashboard-vehicles.spec.ts (confirmed live: a bare
  // wait before interacting made the upload succeed; here it's retried
  // instead of just waiting, since retrying is the more robust fix).
  await expect(async () => {
    await page.locator("#showroom-logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
    await expect(page.getByText("logo.png")).toBeVisible();
  }).toPass({ timeout: 10_000 });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Showroom profile updated.")).toBeVisible();

  const { data: afterUpload } = await admin().from("showrooms").select("logo_storage_path").eq("owner_user_id", ownerId).single();
  expect(afterUpload?.logo_storage_path).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("checkbox", { name: /remove current logo/i })).toBeVisible();
  await page.getByRole("checkbox", { name: /remove current logo/i }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Showroom profile updated.")).toBeVisible();

  const { data: afterRemove } = await admin().from("showrooms").select("logo_storage_path").eq("owner_user_id", ownerId).single();
  expect(afterRemove?.logo_storage_path).toBeNull();
});

test("a pending showroom can still edit its profile", async ({ page }) => {
  await admin().from("showrooms").update({ status: "PENDING", verified: false }).eq("owner_user_id", ownerId);

  await loginAsFixtureOwner(page);
  await expect(page.getByText("Your showroom is under review")).toBeVisible();

  await page.goto("/dashboard/profile");
  await expect(page.locator("#showroom-business-name")).toHaveValue("E2E Profile Fixture Showroom");
  await page.locator("#showroom-business-name").fill("Pending Showroom Renamed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Showroom profile updated.")).toBeVisible();

  const { data } = await admin().from("showrooms").select("business_name, status").eq("owner_user_id", ownerId).single();
  expect(data?.business_name).toBe("Pending Showroom Renamed");
  expect(data?.status).toBe("PENDING");
});

test("visiting /dashboard/profile while signed out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/login$/);
});
