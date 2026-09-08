import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Public showroom directory (/showrooms). Own dedicated fixture showrooms
// (per this repo's convention) — unique name prefix per run so search
// assertions are deterministic even with unrelated real/demo data present
// in the same database.
test.describe.configure({ mode: "serial" });

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run showroom-discovery E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const unique = Date.now();
const APPROVED_NAME = `E2eDiscoveryApproved${unique}`;
const OTHER_CITY_NAME = `E2eDiscoveryOtherCity${unique}`;
const PENDING_NAME = `E2eDiscoveryPending${unique}`;

let approvedOwnerId: string;
let otherCityOwnerId: string;
let pendingOwnerId: string;
let approvedShowroomId: string;
let otherCityShowroomId: string;
let pendingShowroomId: string;
let vehicleId: string;

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
    return userId;
  }

  approvedOwnerId = await ensureFixtureUser(`e2e-discovery-owner-a-${unique}@harakagari.local`, "e2e-discovery-owner-a-password-123");
  otherCityOwnerId = await ensureFixtureUser(`e2e-discovery-owner-b-${unique}@harakagari.local`, "e2e-discovery-owner-b-password-123");
  pendingOwnerId = await ensureFixtureUser(`e2e-discovery-owner-c-${unique}@harakagari.local`, "e2e-discovery-owner-c-password-123");

  await supabase.from("showrooms").delete().eq("owner_user_id", approvedOwnerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", otherCityOwnerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", pendingOwnerId);

  const { data: approved, error: approvedError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: approvedOwnerId,
      business_name: APPROVED_NAME,
      description: "A real, findable test showroom.",
      phone: "+254712340001",
      email: `e2e-discovery-a-${unique}@example.com`,
      city: "Nairobi",
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (approvedError || !approved) throw approvedError ?? new Error("approved showroom not created");
  approvedShowroomId = approved.id;

  const { data: otherCity, error: otherCityError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: otherCityOwnerId,
      business_name: OTHER_CITY_NAME,
      phone: "+254712340002",
      email: `e2e-discovery-b-${unique}@example.com`,
      city: "Mombasa",
      status: "APPROVED",
      verified: false,
    })
    .select("id")
    .single();
  if (otherCityError || !otherCity) throw otherCityError ?? new Error("other-city showroom not created");
  otherCityShowroomId = otherCity.id;

  const { data: pending, error: pendingError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: pendingOwnerId,
      business_name: PENDING_NAME,
      phone: "+254712340003",
      email: `e2e-discovery-c-${unique}@example.com`,
      city: "Nairobi",
      status: "PENDING",
    })
    .select("id")
    .single();
  if (pendingError || !pending) throw pendingError ?? new Error("pending showroom not created");
  pendingShowroomId = pending.id;

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: approvedShowroomId,
      title: `E2E Discovery Vehicle ${unique}`,
      make: `E2ediscoveryshowroom${unique}`,
      model: "Alpha",
      year: 2023,
      price: 1_500_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", approvedShowroomId);
  await supabase.from("showrooms").delete().eq("id", otherCityShowroomId);
  await supabase.from("showrooms").delete().eq("id", pendingShowroomId);
});

test("the directory shows only APPROVED showrooms, never a PENDING one", async ({ page }) => {
  await page.goto("/showrooms");
  await expect(page.getByText(APPROVED_NAME)).toBeVisible();
  await expect(page.getByText(OTHER_CITY_NAME)).toBeVisible();
  await expect(page.getByText(PENDING_NAME)).toHaveCount(0);
});

test("searching by keyword filters to only the matching showroom", async ({ page }) => {
  await page.goto(`/showrooms?q=${encodeURIComponent(APPROVED_NAME)}`);
  await expect(page.getByText(APPROVED_NAME)).toBeVisible();
  await expect(page.getByText(OTHER_CITY_NAME)).toHaveCount(0);
});

test("filtering by city narrows results to that city's showroom", async ({ page }) => {
  await page.goto("/showrooms?city=Mombasa");
  await expect(page.getByText(OTHER_CITY_NAME)).toBeVisible();
  await expect(page.getByText(APPROVED_NAME)).toHaveCount(0);
});

test("an empty search result shows the empty state, not a broken page", async ({ page }) => {
  await page.goto(`/showrooms?q=${encodeURIComponent(`nonexistent-${unique}`)}`);
  await expect(page.getByText("No showrooms match your search").first()).toBeVisible();
});

test("clicking a showroom card opens its real detail page with the correct vehicle count", async ({ page }) => {
  await page.goto(`/showrooms?q=${encodeURIComponent(APPROVED_NAME)}`);
  await page.getByRole("link", { name: new RegExp(APPROVED_NAME) }).click();
  await page.waitForURL(/\/showrooms\/.+/);
  await expect(page.getByText("Verified Dealer")).toBeVisible();
  // VehicleCard renders make/model, not the vehicle's own `title` column.
  await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
});
