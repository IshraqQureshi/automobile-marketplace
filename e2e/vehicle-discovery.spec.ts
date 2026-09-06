import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture showroom/vehicles (per this repo's convention) —
// unique make prefix per run so search/filter assertions are deterministic
// even with unrelated real/demo data present in the same database.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-vehicle-discovery-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-vehicle-discovery-owner-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run vehicle-discovery E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const unique = Date.now();
const MAKE = `E2ediscovery${unique}`;
let showroomId: string;
let cheapVehicleId: string;
let expensiveVehicleId: string;
let draftVehicleId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser() {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === OWNER_EMAIL);
  }

  let ownerId = (await findFixtureUser())?.id;
  if (!ownerId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: OWNER_EMAIL, password: OWNER_PASSWORD, email_confirm: true });
    if (created.user) {
      ownerId = created.user.id;
    } else {
      ownerId = (await findFixtureUser())?.id;
      if (!ownerId) throw new Error(`Failed to create fixture user: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(ownerId, { password: OWNER_PASSWORD });

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Vehicle Discovery Showroom ${unique}`,
      phone: "+254712345678",
      email: `e2e-vehicle-discovery-showroom-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
      city: "Nairobi",
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  const { data: cheap, error: cheapError } = await supabase
    .from("vehicles")
    .insert({ showroom_id: showroomId, title: `${MAKE} Cheap`, make: MAKE, model: "Alpha", year: 2018, price: 1_000_000, status: "ACTIVE" })
    .select("id")
    .single();
  if (cheapError || !cheap) throw cheapError ?? new Error("cheap vehicle not created");
  cheapVehicleId = cheap.id;

  const { data: expensive, error: expensiveError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `${MAKE} Expensive`,
      make: MAKE,
      model: "Beta",
      year: 2022,
      price: 9_000_000,
      description: "A real description for the expensive fixture vehicle.",
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (expensiveError || !expensive) throw expensiveError ?? new Error("expensive vehicle not created");
  expensiveVehicleId = expensive.id;

  const { data: draft, error: draftError } = await supabase
    .from("vehicles")
    .insert({ showroom_id: showroomId, title: `${MAKE} Draft`, make: MAKE, model: "Gamma", year: 2020, price: 2_000_000, status: "DRAFT" })
    .select("id")
    .single();
  if (draftError || !draft) throw draftError ?? new Error("draft vehicle not created");
  draftVehicleId = draft.id;
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().in("id", [cheapVehicleId, expensiveVehicleId, draftVehicleId]);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

function detailPath(id: string, model: string) {
  return `/${MAKE.toLowerCase()}/${model.toLowerCase()}-${id}`;
}

test("browsing /listing shows only ACTIVE listings for the fixture make, not the draft one", async ({ page }) => {
  await page.goto(`/listing?make=${encodeURIComponent(MAKE)}`);
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gamma" })).toHaveCount(0);
});

test("searching by keyword filters to only matching results", async ({ page }) => {
  await page.goto("/listing");
  await page.locator("#vehicle-search-q").fill(MAKE);
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL(/q=/);
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beta" })).toBeVisible();
});

test("filtering by brand narrows results to just that brand", async ({ page }) => {
  await page.goto("/listing");
  await expect(page.getByText("Brand", { exact: true })).toBeVisible();
  await page.locator("#vehicle-filter-make").selectOption(MAKE);
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL(new RegExp(`make=${encodeURIComponent(MAKE)}`));
  await expect(page.getByText("2 cars found")).toBeVisible();
});

test("sorting by price low-to-high orders the cheaper fixture vehicle first", async ({ page }) => {
  await page.goto(`/listing?make=${encodeURIComponent(MAKE)}`);
  await page.getByLabel("Sort vehicles").selectOption("price-asc");
  await page.waitForURL(/sort=price-asc/);

  const cards = page.locator('a[href^="/"]:has-text("View")');
  await expect(cards.first()).toContainText("Alpha");
});

test("an empty search result shows the empty state, not a broken page", async ({ page }) => {
  await page.goto(`/listing?q=${encodeURIComponent(`nonexistent-vehicle-${unique}`)}`);
  await expect(page.getByText("No vehicles match your search")).toBeVisible();
});

test("clicking a vehicle card opens its /{brand}/{slug} detail page with real specifications, showroom info, and a view counter", async ({ page }) => {
  const path = detailPath(expensiveVehicleId, "Beta");
  await page.goto(path);
  await expect(page.getByRole("heading", { name: `2022 ${MAKE} Beta` })).toBeVisible();
  await expect(page.getByText("Ksh 9,000,000")).toBeVisible();
  await expect(page.getByText("A real description for the expensive fixture vehicle.")).toBeVisible();
  await expect(page.getByText(`E2E Vehicle Discovery Showroom ${unique}`).first()).toBeVisible();
  await expect(page.getByText(/\d+ views?/)).toBeVisible();

  // Day 4/5-dependent actions render as real, visibly-disabled controls —
  // not omitted, and not fabricated as if they worked.
  await expect(page.getByRole("button", { name: "Send Message" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "WhatsApp" })).toBeDisabled();

  // Real, honest empty state — no fabricated financing figures for a
  // listing that never had financing fields configured.
  await expect(page.getByText("Financing details not provided for this listing")).toBeVisible();
});

test("view count increments on each real page load", async ({ page }) => {
  const path = detailPath(cheapVehicleId, "Alpha");
  await page.goto(path);
  const firstText = await page.getByText(/\d+ views?/).textContent();
  const firstCount = Number(firstText?.match(/\d+/)?.[0]);

  await page.goto(path);
  const secondText = await page.getByText(/\d+ views?/).textContent();
  const secondCount = Number(secondText?.match(/\d+/)?.[0]);

  expect(secondCount).toBe(firstCount + 1);
});

test("visiting a draft (non-ACTIVE) vehicle's detail page renders the not-found page rather than exposing it", async ({ page }) => {
  // Asserts real content, not the HTTP status: the app-wide root
  // src/app/loading.tsx creates a global Suspense boundary that starts
  // streaming a 200 before this page's notFound() call resolves — a known
  // Next.js App Router interaction (loading.tsx locks the status to 200
  // once any HTML has flushed), pre-existing and not introduced by this
  // feature (see B-009 in MVP_PROGRESS.md).
  await page.goto(detailPath(draftVehicleId, "Gamma"));
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("a malformed detail-page slug (no valid uuid) renders not-found rather than erroring", async ({ page }) => {
  await page.goto(`/${MAKE.toLowerCase()}/not-a-real-slug`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
