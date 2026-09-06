import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ADM-004 (Vehicle Moderation). Own dedicated fixture showrooms/vehicles/
// admin (per this repo's convention — see vehicle-inquiry.spec.ts).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const OWNER_A_EMAIL = `e2e-moderation-owner-a-${unique}@harakagari.local`;
const OWNER_A_PASSWORD = "e2e-moderation-owner-a-password-123";
const OWNER_B_EMAIL = `e2e-moderation-owner-b-${unique}@harakagari.local`;
const OWNER_B_PASSWORD = "e2e-moderation-owner-b-password-123";
const ADMIN_EMAIL = `e2e-moderation-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-moderation-admin-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run vehicle-moderation E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let showroomAId: string;
let showroomBId: string;
let vehicleAId: string; // Owned by showroom A — the one we moderate.
let vehicleBId: string; // Owned by showroom B — proves cross-showroom visibility/search.
let vehiclePathA: string;

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

  const ownerAId = await ensureFixtureUser(OWNER_A_EMAIL, OWNER_A_PASSWORD);
  const ownerBId = await ensureFixtureUser(OWNER_B_EMAIL, OWNER_B_PASSWORD);
  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerAId);
  await supabase.from("showrooms").delete().eq("owner_user_id", ownerBId);

  const { data: showroomA, error: showroomAError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerAId,
      business_name: `E2E Moderation Showroom A ${unique}`,
      phone: "+254712345680",
      email: `e2e-moderation-showroom-a-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (showroomAError || !showroomA) throw showroomAError ?? new Error("showroom A not created");
  showroomAId = showroomA.id;

  const { data: showroomB, error: showroomBError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerBId,
      business_name: `E2E Moderation Showroom B ${unique}`,
      phone: "+254712345681",
      email: `e2e-moderation-showroom-b-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
    })
    .select("id")
    .single();
  if (showroomBError || !showroomB) throw showroomBError ?? new Error("showroom B not created");
  showroomBId = showroomB.id;

  const { data: vehicleA, error: vehicleAError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomAId,
      title: `E2E Moderation Vehicle A ${unique}`,
      make: `E2emoderationa${unique}`,
      model: "Alpha",
      year: 2022,
      price: 1_500_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleAError || !vehicleA) throw vehicleAError ?? new Error("vehicle A not created");
  vehicleAId = vehicleA.id;
  vehiclePathA = `/e2emoderationa${unique}/alpha-${vehicleAId}`;

  const { data: vehicleB, error: vehicleBError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomBId,
      title: `E2E Moderation Vehicle B ${unique}`,
      make: `E2emoderationb${unique}`,
      model: "Beta",
      year: 2021,
      price: 900_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleBError || !vehicleB) throw vehicleBError ?? new Error("vehicle B not created");
  vehicleBId = vehicleB.id;
});

test.afterEach(async () => {
  // A couple of tests deliberately change vehicleA's status — reset it to
  // ACTIVE between tests so each test starts from a known baseline.
  await admin().from("vehicles").update({ status: "ACTIVE" }).eq("id", vehicleAId);
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().in("id", [vehicleAId, vehicleBId]);
  await supabase.from("showrooms").delete().in("id", [showroomAId, showroomBId]);
});

test("admin sees listings from every showroom, and search + status filter narrow the list", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/vehicles");
  await expect(page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle A ${unique}`) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle B ${unique}`) })).toBeVisible();

  // Search narrows to just the matching showroom's vehicle.
  await page.getByPlaceholder("Search title, make, model, or showroom…").fill(`E2E Moderation Showroom A ${unique}`);
  await expect(page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle A ${unique}`) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle B ${unique}`) })).toHaveCount(0);
  await page.getByPlaceholder("Search title, make, model, or showroom…").fill("");

  // Status filter: both fixture vehicles are ACTIVE ("Published"); filtering
  // to SOLD must exclude both without touching real seed data's own counts.
  await page.getByLabel("Filter by status").selectOption("SOLD");
  await expect(page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle A ${unique}`) })).toHaveCount(0);
  await expect(page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle B ${unique}`) })).toHaveCount(0);
});

test("admin can deactivate an ACTIVE listing, and the change is reflected on the public marketplace immediately", async ({ page }) => {
  // Confirm it's live before moderating. The detail page's <h1> is
  // "{year} {make} {model}", not the vehicle's own `title` field — search
  // by make (unique per fixture run) instead.
  await page.goto(vehiclePathA);
  await expect(page.getByRole("heading", { name: new RegExp(`E2emoderationa${unique}`, "i") })).toBeVisible();

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/vehicles");
  const row = page.getByRole("row", { name: new RegExp(`E2E Moderation Vehicle A ${unique}`) });
  await expect(row).toBeVisible();
  const statusSelect = row.getByLabel(/Status for/);

  // Same hydration-race class documented in dashboard-vehicles.spec.ts: this
  // <select> is already present in the very first paint after navigation, so
  // an interaction fired the instant the page becomes actionable can land
  // before hydration attaches its change handler and get silently reverted
  // on the next render — retry until the DOM genuinely reflects it.
  await expect(async () => {
    await statusSelect.selectOption("INACTIVE");
    await expect(statusSelect).toHaveValue("INACTIVE");
  }).toPass({ timeout: 10_000 });
  await expect(page.getByText("Marked as removed.")).toBeVisible();

  const { data } = await admin().from("vehicles").select("status").eq("id", vehicleAId).single();
  expect(data?.status).toBe("INACTIVE");

  // Moderation state reflected publicly (ADM-004 acceptance criterion): the
  // detail page's own query filters on status = 'ACTIVE' regardless of
  // viewer, so it no longer renders the vehicle for anyone, admin included.
  await page.goto(vehiclePathA);
  await expect(page.getByRole("heading", { name: new RegExp(`E2emoderationa${unique}`, "i") })).toHaveCount(0);
});

test("a showroom owner cannot moderate another showroom's vehicle by calling the admin action directly", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_B_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_B_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/dashboard$/);

  // /admin is behind its own ADMIN-only layout guard — a signed-in showroom
  // owner is redirected away rather than shown the moderation UI at all.
  await page.goto("/admin/vehicles");
  await expect(page).not.toHaveURL(/\/admin\/vehicles$/);

  // Belt-and-braces: even if the UI were somehow reachable, RLS itself
  // (vehicles_update_owner_or_admin — already covered directly in
  // rls.integration.test.ts) rejects the underlying update for anyone who
  // is neither the vehicle's owner nor an admin. Vehicle A belongs to
  // showroom A, not this owner (showroom B) — confirm it's untouched.
  const { data } = await admin().from("vehicles").select("status").eq("id", vehicleAId).single();
  expect(data?.status).toBe("ACTIVE");
});
