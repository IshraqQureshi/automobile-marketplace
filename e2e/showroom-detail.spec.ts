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
      youtube_channel_url: "https://www.youtube.com/@e2eshowroom",
      youtube_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
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
  await page.goto(showroomPath);

  await expect(page.getByRole("heading", { name: SHOWROOM_NAME, exact: true })).toBeVisible();
  await expect(page.getByText("Verified Dealer")).toBeVisible();
  await expect(page.getByText("Kilimani, Nairobi")).toBeVisible();
  await expect(page.getByText("Mon–Sat, 8am–6pm")).toBeVisible();
  await expect(page.getByText(/Member since/)).toBeVisible();

  await expect(page.getByText(new RegExp(`E2Esdetaila${unique}`))).toBeVisible();
  await expect(page.getByText(new RegExp(`E2Esdetailb${unique}`))).toBeVisible();
  await expect(page.getByText("Available Cars(2)")).toBeVisible();
});

test("type-filter pills and sort narrow/reorder the real vehicle list", async ({ page }) => {
  await page.goto(showroomPath);

  await page.getByRole("button", { name: "SUV" }).click();
  await expect(page.getByText(new RegExp(`E2Esdetaila${unique}`))).toBeVisible();
  await expect(page.getByText(new RegExp(`E2Esdetailb${unique}`))).toHaveCount(0);

  await page.getByRole("button", { name: "All" }).click();
  await page.getByLabel("Sort listings").selectOption("price-asc");
  const firstCardPrice = page.locator("p.text-lg.font-bold").first();
  await expect(firstCardPrice).toHaveText("Ksh 1,000,000");
});

test("the YouTube section shows the real channel link and embedded video when configured", async ({ page }) => {
  await page.goto(showroomPath);

  await expect(page.getByText("ON YOUTUBE")).toBeVisible();
  await expect(page.getByRole("link", { name: "View Channel" })).toHaveAttribute("href", "https://www.youtube.com/@e2eshowroom");
  await expect(page.locator("iframe")).toHaveAttribute("src", /autoplay=0/);
});

test("the Message button opens WhatsApp to the admin-configured global number, and is disabled when unset", async ({ page }) => {
  const supabase = admin();

  await supabase.from("system_settings").update({ value: "254799888777" }).eq("key", "whatsapp_contact_number");
  await page.goto(showroomPath);
  const messageLink = page.getByRole("link", { name: "Message" });
  await expect(messageLink).toHaveAttribute("href", new RegExp(`^https://wa\\.me/254799888777\\?text=`));

  await supabase.from("system_settings").update({ value: "" }).eq("key", "whatsapp_contact_number");
  await page.goto(showroomPath);
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
