import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture showroom/vehicles (per this repo's convention) —
// unique make prefix per run so search/filter assertions are deterministic
// even with unrelated real/demo data present in the same database.
test.describe.configure({ mode: "serial" });

const OWNER_EMAIL = "e2e-vehicle-discovery-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-vehicle-discovery-owner-fixture-password-123";
const CUSTOMER_EMAIL = "e2e-vehicle-discovery-customer-fixture@harakagari.local";
const CUSTOMER_PASSWORD = "e2e-vehicle-discovery-customer-fixture-password-123";

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

  const ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  await ensureFixtureUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

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

  // "Send Message" is a real, working inquiry form as of the vehicle-inquiry
  // feature (see e2e/vehicle-inquiry.spec.ts for its own dedicated coverage)
  // — only WhatsApp/Test Drive/Financing application remain real, visibly-
  // disabled controls pending their own Day 4/5 dependencies.
  await expect(page.getByRole("button", { name: "Send Message" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "WhatsApp" })).toBeDisabled();

  // Real, honest empty state — no fabricated financing figures for a
  // listing that never had financing fields configured.
  await expect(page.getByText("Financing details not provided for this listing")).toBeVisible();
});

async function readViewCount(page: import("@playwright/test").Page, path: string): Promise<number> {
  await page.goto(path);
  const text = await page.getByText(/\d+ views?/).textContent();
  return Number(text?.match(/\d+/)?.[0]);
}

test("view count: dedupes anonymous visits by IP, counts a distinct logged-in customer once, and never counts the vehicle's own showroom owner", async ({
  page,
  browser,
}) => {
  const path = detailPath(cheapVehicleId, "Alpha");

  // Two anonymous visits from the same client (same IP, no session) — the
  // second must not increment (deduped), unlike the old flat per-load counter.
  const anonVisit1 = await readViewCount(page, path);
  const anonVisit2 = await readViewCount(page, path);
  expect(anonVisit2).toBe(anonVisit1 + 1);
  const anonVisit3 = await readViewCount(page, path);
  expect(anonVisit3).toBe(anonVisit2);

  // A distinct logged-in customer is a genuinely new viewer — counts once,
  // then dedupes on their own repeat visit too.
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto("/login");
  await customerPage.getByLabel("Email address").fill(CUSTOMER_EMAIL);
  await customerPage.getByLabel("Password", { exact: true }).fill(CUSTOMER_PASSWORD);
  await customerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await customerPage.waitForURL(/\/account$/);
  // The displayed count is always the pre-this-visit value (read before the
  // RPC runs) — a new viewer's own +1 only shows up on their *next* visit.
  const customerVisit1 = await readViewCount(customerPage, path);
  expect(customerVisit1).toBe(anonVisit3);
  const customerVisit2 = await readViewCount(customerPage, path);
  expect(customerVisit2).toBe(customerVisit1 + 1);
  const customerVisit3 = await readViewCount(customerPage, path);
  expect(customerVisit3).toBe(customerVisit2);
  await customerContext.close();

  // The vehicle's own showroom owner viewing their own listing must never
  // count, no matter how many times.
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto("/login");
  await ownerPage.getByLabel("Email address").fill(OWNER_EMAIL);
  await ownerPage.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await ownerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await ownerPage.waitForURL(/\/dashboard$/);
  const ownerVisit1 = await readViewCount(ownerPage, path);
  const ownerVisit2 = await readViewCount(ownerPage, path);
  expect(ownerVisit1).toBe(customerVisit3);
  expect(ownerVisit2).toBe(customerVisit3);
  await ownerContext.close();
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
