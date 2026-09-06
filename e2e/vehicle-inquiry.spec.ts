import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture showroom/vehicle/admin (per this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const OWNER_EMAIL = `e2e-inquiry-owner-fixture-${unique}@harakagari.local`;
const OWNER_PASSWORD = "e2e-inquiry-owner-fixture-password-123";
const OTHER_OWNER_EMAIL = `e2e-inquiry-other-owner-fixture-${unique}@harakagari.local`;
const OTHER_OWNER_PASSWORD = "e2e-inquiry-other-owner-fixture-password-123";
const ADMIN_EMAIL = `e2e-inquiry-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-inquiry-admin-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run vehicle-inquiry E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let vehicleId: string;
let vehiclePath: string;
let showroomId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function ensureFixtureUser(email: string, password: string): Promise<string> {
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
    return userId;
  }

  const ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  const otherOwnerId = await ensureFixtureUser(OTHER_OWNER_EMAIL, OTHER_OWNER_PASSWORD);
  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", otherOwnerId);

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Inquiry Showroom ${unique}`,
      phone: "+254712345678",
      email: `e2e-inquiry-showroom-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  await supabase.from("showrooms").insert({
    owner_user_id: otherOwnerId,
    business_name: `E2E Inquiry Other Showroom ${unique}`,
    phone: "+254712345679",
    email: `e2e-inquiry-other-showroom-${unique}@example.com`,
    status: "APPROVED",
    verified: true,
  });

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Inquiry Vehicle ${unique}`,
      make: `E2einquiry${unique}`,
      model: "Alpha",
      year: 2022,
      price: 2_000_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
  vehiclePath = `/e2einquiry${unique}/alpha-${vehicleId}`;
});

test.afterEach(async () => {
  await admin().from("vehicle_inquiries").delete().eq("vehicle_id", vehicleId);
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

test("an anonymous visitor can submit a real inquiry, stored with no customer_id", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Send Message" }).click();

  await page.getByLabel("Full Name").fill("Anonymous Buyer");
  await page.getByLabel("Email").fill(`anon-buyer-${unique}@example.com`);
  await page.getByLabel("Phone").fill("712345678");
  await page.locator("#inquiry-message").fill("Is this vehicle still available for a test drive next week?");
  await page.getByRole("button", { name: "Send Message" }).last().click();

  await expect(page.getByText("Message sent!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin().from("vehicle_inquiries").select("customer_id, contact_name, contact_phone, status").eq("vehicle_id", vehicleId).single();
  expect(data?.customer_id).toBeNull();
  expect(data?.contact_name).toBe("Anonymous Buyer");
  expect(data?.contact_phone).toBe("+254712345678");
  expect(data?.status).toBe("NEW");
});

test("the form validates required fields before submitting", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Send Message" }).click();

  await page.getByLabel("Email").fill("not-an-email");
  await page.locator("#inquiry-message").fill("short");
  await page.getByRole("button", { name: "Send Message" }).last().click();

  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(page.getByText("Message must be at least 10 characters")).toBeVisible();

  const { count } = await admin().from("vehicle_inquiries").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId);
  expect(count).toBe(0);
});

test("admin can see the inquiry, opening it marks it VIEWED and drops the sidebar badge", async ({ page }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Send Message" }).click();
  await page.getByLabel("Full Name").fill("Admin Visibility Test");
  await page.getByLabel("Email").fill(`admin-visibility-${unique}@example.com`);
  await page.getByLabel("Phone").fill("712345678");
  await page.locator("#inquiry-message").fill("Checking that admins can see this real inquiry.");
  await page.getByRole("button", { name: "Send Message" }).last().click();
  await expect(page.getByText("Message sent!")).toBeVisible({ timeout: 10000 });

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/inquiries");
  const row = page.getByRole("row", { name: /Admin Visibility Test/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("new", { exact: true })).toBeVisible();

  const badgeBefore = await page.locator("aside").getByText(/^\d+$/).first().textContent();

  await row.click();
  await expect(page.getByRole("dialog").getByText("Checking that admins can see this real inquiry.")).toBeVisible();
  await page.getByLabel("Close").click();

  await expect(row.getByText("viewed", { exact: true })).toBeVisible();

  // markInquiryViewedAction's revalidatePath only invalidates the cache —
  // a real navigation (not just the client-side state update above) is
  // what actually re-fetches the sidebar's server-rendered unread count.
  await page.reload();
  await page.waitForTimeout(500);
  const badgeAfterCount = await page.locator("aside").getByText(/^\d+$/).count();
  if (Number(badgeBefore) - 1 === 0) {
    expect(badgeAfterCount).toBe(0);
  } else {
    const badgeAfter = await page.locator("aside").getByText(/^\d+$/).first().textContent();
    expect(Number(badgeAfter)).toBe(Number(badgeBefore) - 1);
  }
});

test("the owning showroom sees the inquiry in its own dashboard, but a different showroom does not", async ({ page, browser }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Send Message" }).click();
  await page.getByLabel("Full Name").fill("Showroom Scoping Test");
  await page.getByLabel("Email").fill(`showroom-scoping-${unique}@example.com`);
  await page.getByLabel("Phone").fill("712345678");
  await page.locator("#inquiry-message").fill("Checking that only the right showroom sees this real inquiry.");
  await page.getByRole("button", { name: "Send Message" }).last().click();
  await expect(page.getByText("Message sent!")).toBeVisible({ timeout: 10000 });

  // Separate browser contexts (not just re-navigating to /login on the same
  // page) so each identity gets its own session — reusing one already-
  // authenticated page's session for a second login just redirects /login
  // straight to /account instead of showing the form.
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto("/login");
  await ownerPage.getByLabel("Email address").fill(OWNER_EMAIL);
  await ownerPage.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await ownerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await ownerPage.waitForURL(/\/dashboard$/);
  await ownerPage.goto("/dashboard/inquiries", { waitUntil: "domcontentloaded" });
  await expect(ownerPage.getByText("Showroom Scoping Test")).toBeVisible();
  await ownerContext.close();

  const otherOwnerContext = await browser.newContext();
  const otherOwnerPage = await otherOwnerContext.newPage();
  await otherOwnerPage.goto("/login");
  await otherOwnerPage.getByLabel("Email address").fill(OTHER_OWNER_EMAIL);
  await otherOwnerPage.getByLabel("Password", { exact: true }).fill(OTHER_OWNER_PASSWORD);
  await otherOwnerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await otherOwnerPage.waitForURL(/\/dashboard$/);
  await otherOwnerPage.goto("/dashboard/inquiries", { waitUntil: "domcontentloaded" });
  await expect(otherOwnerPage.getByText("Showroom Scoping Test")).toHaveCount(0);
  await otherOwnerContext.close();
});
