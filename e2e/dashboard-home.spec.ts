import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture accounts (per this repo's convention — see
// e2e/dashboard-vehicles.spec.ts's own note on this) rather than reusing
// another spec's fixture, since this spec needs its own approved showroom
// (with vehicles inserted directly, not via the form) and a separate
// pending showroom, independent of any other spec's showroom lifecycle.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-dashboard-home-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-dashboard-home-owner-fixture-password-123";
const PENDING_OWNER_EMAIL = "e2e-dashboard-home-pending-fixture@harakagari.local";
const PENDING_OWNER_PASSWORD = "e2e-dashboard-home-pending-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run dashboard-home E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let ownerId: string;
let showroomId: string;
let pendingOwnerId: string;
let pendingShowroomId: string;

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
    await supabase.auth.admin.updateUserById(userId, { password });
    return userId;
  }

  ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  pendingOwnerId = await ensureFixtureUser(PENDING_OWNER_EMAIL, PENDING_OWNER_PASSWORD);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", pendingOwnerId);

  const { data: showroom, error } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Dashboard Home Showroom ${Date.now()}`,
      phone: "+254712345678",
      email: "e2e-dashboard-home-showroom@example.com",
      city: "Nairobi",
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (error || !showroom) throw error ?? new Error("showroom not created");
  showroomId = showroom.id;

  const { data: pendingShowroom, error: pendingError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: pendingOwnerId,
      business_name: `E2E Dashboard Home Pending Showroom ${Date.now()}`,
      phone: "+254712345679",
      email: "e2e-dashboard-home-pending-showroom@example.com",
      city: "Mombasa",
    })
    .select("id")
    .single();
  if (pendingError || !pendingShowroom) throw pendingError ?? new Error("pending showroom not created");
  pendingShowroomId = pendingShowroom.id;
});

test.afterEach(async () => {
  await admin().from("vehicles").delete().eq("showroom_id", showroomId);
});

test.afterAll(async () => {
  await admin().from("showrooms").delete().in("id", [showroomId, pendingShowroomId]);
});

async function loginAsFixtureOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");
}

async function loginAsPendingOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(PENDING_OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PENDING_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");
}

test("an approved showroom sees real stat counts and its recent listings, linking through to edit", async ({ page }) => {
  const supabase = admin();
  const { data: vehicle1 } = await supabase
    .from("vehicles")
    .insert({ showroom_id: showroomId, title: "Reliable family SUV", make: "Toyota", model: "RAV4", year: 2020, price: 3200000, status: "ACTIVE" })
    .select("id")
    .single();
  await supabase
    .from("vehicles")
    .insert({ showroom_id: showroomId, title: "Fuel-efficient commuter", make: "Toyota", model: "Vitz", year: 2017, price: 900000, status: "DRAFT" });

  await loginAsFixtureOwner(page);

  await expect(page.locator("#stat-total")).toHaveText("2");
  await expect(page.locator("#stat-published")).toHaveText("1");
  await expect(page.locator("#stat-drafts")).toHaveText("1");
  await expect(page.locator("#stat-sold")).toHaveText("0");

  const recentListings = page.locator("li").filter({ hasText: "Reliable family SUV" });
  await expect(recentListings.getByText("Published", { exact: true })).toBeVisible();
  const draftListing = page.locator("li").filter({ hasText: "Fuel-efficient commuter" });
  await expect(draftListing.getByText("Draft", { exact: true })).toBeVisible();

  await recentListings.click();
  await page.waitForURL(`**/dashboard/vehicles/${vehicle1!.id}/edit`);
});

test("a showroom with no vehicles sees an empty state with an add-vehicle action", async ({ page }) => {
  await loginAsFixtureOwner(page);

  await expect(page.getByText("No vehicles yet")).toBeVisible();
  await page.getByRole("link", { name: "Add a vehicle" }).first().click();
  await page.waitForURL("**/dashboard/vehicles/new");
});

test("a pending showroom sees the status banner and can still edit its profile from the dashboard", async ({ page }) => {
  await loginAsPendingOwner(page);

  await expect(page.getByText("Your showroom is under review")).toBeVisible();
  await expect(page.getByText("Total listings")).toHaveCount(0);

  await page.getByRole("link", { name: "Edit showroom profile" }).click();
  await page.waitForURL("**/dashboard/profile");
});

test.describe("mobile dashboard navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the mobile menu opens the sidebar drawer and closes it after navigating", async ({ page }) => {
    await loginAsFixtureOwner(page);

    await expect(page.getByRole("link", { name: "Vehicles", exact: true })).not.toBeInViewport();
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Vehicles", exact: true })).toBeInViewport();

    await page.getByRole("link", { name: "Vehicles", exact: true }).click();
    await page.waitForURL("**/dashboard/vehicles");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });
});
