import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Showroom Detail Page (public marketplace-facing). Own dedicated fixture
// showroom + vehicles + admin (per this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const ADMIN_EMAIL = `e2e-showroom-detail-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-showroom-detail-admin-fixture-password-123";
const OWNER_EMAIL = `e2e-showroom-detail-owner-fixture-${unique}@harakagari.local`;
const OWNER_PASSWORD = "e2e-showroom-detail-owner-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run showroom-detail E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SHOWROOM_NAME = `E2E Showroom Detail ${unique}`;
let showroomId: string;
// Every navigation to this fixture showroom's own page below uses
// { waitUntil: "domcontentloaded" } rather than the Playwright default
// "load" — its YouTube playlist embed's cross-origin request to
// youtube.com never resolves in this sandboxed test environment
// (confirmed live: "load" timed out waiting on it), so the fixture always
// has a real iframe on it once youtube_playlist_url is seeded below.
let showroomPath: string;
let pendingShowroomId: string;
let vehicleAId: string;
let vehicleBId: string;
let previousWhatsappNumber: string | null = null;

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

  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  const ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: SHOWROOM_NAME,
      phone: "+254712345685",
      email: `e2e-showroom-detail-${unique}@example.com`,
      city: "Kilimani, Nairobi",
      status: "APPROVED",
      verified: true,
      opening_hours: "Mon–Sat, 8am–6pm",
      // Admin-only field now (see 20260913020000_showroom_youtube_playlist.sql)
      // — inserting via the service-role client bypasses
      // prevent_showroom_youtube_playlist_self_edit (that trigger only
      // blocks a non-admin UPDATE, not this fixture's own INSERT).
      youtube_playlist_url: "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;
  showroomPath = `/showrooms/e2e-showroom-detail-${unique}-${showroomId}`;

  const { data: pendingShowroom, error: pendingError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Showroom Detail Pending ${unique}`,
      phone: "+254712345686",
      email: `e2e-showroom-detail-pending-${unique}@example.com`,
      status: "PENDING",
    })
    .select("id")
    .single();
  // A second showroom for the same owner is blocked by the one-active-showroom
  // partial unique index while APPROVED/PENDING/SUSPENDED — expected to fail
  // here since the owner already has the APPROVED one above; use a distinct
  // owner instead so both fixtures can coexist.
  if (pendingError || !pendingShowroom) {
    const otherOwnerId = await ensureFixtureUser(`e2e-showroom-detail-other-owner-${unique}@harakagari.local`, "e2e-showroom-detail-other-owner-password-123");
    const { data: retryShowroom, error: retryError } = await supabase
      .from("showrooms")
      .insert({
        owner_user_id: otherOwnerId,
        business_name: `E2E Showroom Detail Pending ${unique}`,
        phone: "+254712345687",
        email: `e2e-showroom-detail-pending-${unique}@example.com`,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (retryError || !retryShowroom) throw retryError ?? new Error("pending showroom not created");
    pendingShowroomId = retryShowroom.id;
  } else {
    pendingShowroomId = pendingShowroom.id;
  }

  const { data: vehicleA, error: vehicleAError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Showroom Detail Vehicle A ${unique}`,
      make: `E2Esdetaila${unique}`,
      model: "Alpha",
      year: 2022,
      price: 1_000_000,
      mileage: 5000,
      body_type: "SUV",
      fuel_type: "Diesel",
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleAError || !vehicleA) throw vehicleAError ?? new Error("vehicle A not created");
  vehicleAId = vehicleA.id;

  const { data: vehicleB, error: vehicleBError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Showroom Detail Vehicle B ${unique}`,
      make: `E2Esdetailb${unique}`,
      model: "Beta",
      year: 2023,
      price: 2_000_000,
      mileage: 1000,
      body_type: "Sedan",
      fuel_type: "Petrol",
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleBError || !vehicleB) throw vehicleBError ?? new Error("vehicle B not created");
  vehicleBId = vehicleB.id;

  const { data: existingSetting } = await supabase.from("system_settings").select("value").eq("key", "whatsapp_contact_number").maybeSingle();
  previousWhatsappNumber = typeof existingSetting?.value === "string" ? existingSetting.value : null;
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().in("id", [vehicleAId, vehicleBId]);
  await supabase.from("showrooms").delete().in("id", [showroomId, pendingShowroomId]);
  await supabase.from("system_settings").update({ value: previousWhatsappNumber ?? "" }).eq("key", "whatsapp_contact_number");
});

test("a showroom's public detail page shows its real info and vehicles", async ({ page }) => {
  await page.goto(showroomPath, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: SHOWROOM_NAME, exact: true })).toBeVisible();
  await expect(page.getByText("Verified Dealer")).toBeVisible();
  await expect(page.getByText("Kilimani, Nairobi")).toBeVisible();
  await expect(page.getByText("Mon–Sat, 8am–6pm")).toBeVisible();
  await expect(page.getByText(/Member since/)).toBeVisible();

  // VehicleCard renders make/model separately (not the raw `title` field),
  // and the vehicle's own make (e.g. "E2Esdetaila...") now also appears as
  // a Brand-filter pill button (showroom-vehicle-browser.tsx) — matching
  // model instead avoids both the mismatch and the strict-mode ambiguity.
  await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
  await expect(page.getByText("Beta", { exact: true })).toBeVisible();
  await expect(page.getByText("Available Cars(2)")).toBeVisible();
});

test("brand-filter pills and sort narrow/reorder the real vehicle list", async ({ page }) => {
  await page.goto(showroomPath, { waitUntil: "domcontentloaded" });

  // Pills are real Brand (vehicles.make) values now, not body/fuel type —
  // each fixture vehicle has its own unique make, so filtering by vehicle
  // A's make isolates it exactly like the old body-type pill used to. The
  // pill buttons themselves stay rendered regardless of which is active
  // (only the vehicle grid below is filtered), so asserting on the grid's
  // own model text (not the make/pill text) is what actually proves the
  // filter took effect.
  await page.getByRole("button", { name: `E2Esdetaila${unique}`, exact: true }).click();
  await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
  await expect(page.getByText("Beta", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "All" }).click();
  await page.getByLabel("Sort listings").selectOption("price-asc");
  const firstCardPrice = page.locator("p.text-lg.font-bold").first();
  await expect(firstCardPrice).toHaveText("Ksh 1,000,000");
});

test("the YouTube section embeds the admin-set playlist", async ({ page }) => {
  await page.goto(showroomPath, { waitUntil: "domcontentloaded" });

  await expect(page.getByText("ON YOUTUBE")).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
  );
});

test("the showroom owner's own profile page has no YouTube/video management UI — admin-only now", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL("**/dashboard");

  // domcontentloaded, not the default "load": this dev-server environment's
  // authenticated dashboard pages have been observed to never fire a "load"
  // event at all (confirmed against /dashboard/vehicles too, unrelated to
  // this feature) — same precedent as this file's own stale-slug test below.
  await page.goto("/dashboard/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Showroom profile", level: 1 })).toBeVisible();
  await expect(page.getByText("YouTube", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Featured videos")).toHaveCount(0);
  await expect(page.getByLabel(/Channel URL/)).toHaveCount(0);
});

test("admin can set a showroom's YouTube playlist URL, reflected on the public page", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/showrooms");
  await page.getByRole("row", { name: new RegExp(SHOWROOM_NAME) }).getByRole("button", { name: "Edit" }).click();
  const newPlaylistUrl = "https://www.youtube.com/playlist?list=PLnewplaylistid1234567890abcdef";
  const playlistInput = page.getByLabel(/YouTube playlist URL/);
  await playlistInput.fill(newPlaylistUrl);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Showroom updated.")).toBeVisible();

  await page.goto(showroomPath, { waitUntil: "domcontentloaded" });
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://www.youtube.com/embed/videoseries?list=PLnewplaylistid1234567890abcdef");
});

test("the Message button opens WhatsApp to the admin-configured global number, and is disabled when unset", async ({ page }) => {
  const supabase = admin();

  await supabase.from("system_settings").update({ value: "254799888777" }).eq("key", "whatsapp_contact_number");
  await page.goto(showroomPath, { waitUntil: "domcontentloaded" });
  const messageLink = page.getByRole("link", { name: "Message" });
  await expect(messageLink).toHaveAttribute("href", new RegExp(`^https://wa\\.me/254799888777\\?text=`));

  await supabase.from("system_settings").update({ value: "" }).eq("key", "whatsapp_contact_number");
  await page.goto(showroomPath, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Message" })).toBeDisabled();
});

test("a non-approved showroom's detail page is not publicly reachable", async ({ page }) => {
  await page.goto(`/showrooms/pending-${pendingShowroomId}`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("a stale name-slug still resolves by id and canonicalizes to the real URL", async ({ page }) => {
  await page.goto(`/showrooms/totally-wrong-name-${showroomId}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(showroomId));
  await expect(page.getByRole("heading", { name: SHOWROOM_NAME, exact: true })).toBeVisible();
});

test("a vehicle's own detail page links to its real showroom's detail page", async ({ page }) => {
  await page.goto(`/e2esdetaila${unique}/alpha-${vehicleAId}`);
  const link = page.getByRole("link", { name: "View Dealer Profile →" });
  await expect(link).toHaveAttribute("href", showroomPath);
  await link.click();
  await expect(page.getByRole("heading", { name: SHOWROOM_NAME, exact: true })).toBeVisible();
});

test("admin can set the global WhatsApp number from /admin/settings, validated and persisted", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/settings");
  const input = page.getByLabel("WhatsApp contact number");

  // Same hydration-race class already documented elsewhere in this repo's
  // E2E suite (e.g. dashboard-vehicles.spec.ts): a field/button present in
  // the very first paint after navigation can have its handler attached
  // after the first interaction lands — retry rather than trust one attempt.
  await expect(async () => {
    await input.fill("not-a-number");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/valid phone number/)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 10_000 });

  // Blurring before the click matters here: a real user naturally leaves
  // the field before clicking Save, but Playwright's fill()+click() can
  // land close enough together to race the input's own onBlur-triggered
  // re-render against the click's synthetic event — confirmed live (a
  // standalone debug script without the blur reproduced a silent no-op
  // click; adding it made every attempt succeed).
  await input.fill("711222333");
  await input.blur();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Settings updated.")).toBeVisible();

  const { data } = await admin().from("system_settings").select("value").eq("key", "whatsapp_contact_number").single();
  expect(data?.value).toBe("254711222333");
});
