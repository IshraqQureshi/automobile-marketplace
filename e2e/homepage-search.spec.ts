import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// The homepage hero search (src/components/home/hero-search.tsx) was a
// disabled placeholder until this PR — now a real GET form posting to
// /listing's own `q` param. Own dedicated fixture vehicle (same convention
// as e2e/vehicle-discovery.spec.ts) so the search assertion is deterministic
// regardless of whatever other real/demo data exists in the database.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-homepage-search-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-homepage-search-owner-fixture-password-123";
const CUSTOMER_EMAIL = "e2e-homepage-search-customer-fixture@harakagari.local";
const CUSTOMER_PASSWORD = "e2e-homepage-search-customer-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run homepage-search E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const unique = Date.now();
const MAKE = `E2ehomepagesearch${unique}`;
let showroomId: string;
let ownerId: string;
let vehicleId: string;

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
  await ensureFixtureUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Homepage Search Showroom ${unique}`,
      phone: "+254712345699",
      email: `e2e-homepage-search-showroom-${unique}@example.com`,
      status: "APPROVED",
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({ showroom_id: showroomId, title: `${MAKE} Search Target`, make: MAKE, model: "Alpha", year: 2021, price: 3_000_000, status: "ACTIVE" })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

test("the homepage hero search submits to /listing and shows a matching result", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search vehicles by make, model, or keyword" }).fill(MAKE);
  await page.getByRole("button", { name: "Search" }).click();
  await page.waitForURL(new RegExp(`/listing\\?q=${encodeURIComponent(MAKE)}`));
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
});

test("the homepage hero search shows the empty state for a term with no matches", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search vehicles by make, model, or keyword" }).fill(`nonexistent-vehicle-${unique}`);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("No vehicles match your search")).toBeVisible();
});

test("Register Showroom is absent from the header when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Register Showroom" })).toHaveCount(0);
});

test("Register Showroom appears in the Profile menu once signed in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/account$/);

  await page.getByRole("button", { name: "Profile" }).click();
  const registerLink = page.getByRole("menuitem", { name: "Register Showroom" });
  await expect(registerLink).toBeVisible();
  await expect(registerLink).toHaveAttribute("href", "/register-showroom");
});
