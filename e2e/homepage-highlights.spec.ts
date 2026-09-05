import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture account (per this repo's convention — see
// admin-catalog.spec.ts's own note on why each admin spec file uses a
// distinct fixture email and runs serially).
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = "e2e-homepage-highlights-fixture@harakagari.local";
const ADMIN_PASSWORD = "e2e-homepage-highlights-fixture-password-123";

// A real (tiny, 1x1) PNG rather than a text fixture masquerading as an
// image — same reasoning as TINY_PNG_BASE64 elsewhere in this project's
// E2E suite (e.g. dashboard-vehicles.spec.ts).
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run homepage-highlights E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser() {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === ADMIN_EMAIL);
  }

  let userId = (await findFixtureUser())?.id;
  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
    if (created.user) {
      userId = created.user.id;
    } else {
      userId = (await findFixtureUser())?.id;
      if (!userId) throw new Error(`Failed to create admin fixture user: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
  const { error: promoteError } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (promoteError) throw new Error(`Failed to promote admin fixture user: ${promoteError.message}`);
});

test.afterEach(async () => {
  const supabase = admin();
  const { data: highlights } = await supabase.from("homepage_highlights").select("id, thumbnail_storage_path").ilike("title", "E2E Highlight%");
  for (const h of highlights ?? []) {
    await supabase.storage.from("homepage-highlights").remove([h.thumbnail_storage_path]);
  }
  if (highlights && highlights.length > 0) {
    await supabase
      .from("homepage_highlights")
      .delete()
      .in(
        "id",
        highlights.map((h) => h.id),
      );
  }
  await supabase.from("system_settings").update({ value: "" }).eq("key", "homepage_tiktok_profile_url");
  await supabase.from("system_settings").update({ value: "" }).eq("key", "homepage_youtube_channel_url");
});

async function loginAsFixtureAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL("**/admin");
}

test("visiting /admin/highlights while signed out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin/highlights");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin can create a highlight and it appears on the homepage, linking to the real video URL", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Highlight TikTok ${unique}`;
  const videoUrl = `https://www.tiktok.com/@e2e-test/video/${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/highlights");

  await page.getByRole("button", { name: "New Highlight" }).click();
  await page.getByLabel("Platform").selectOption("TIKTOK");
  await page.locator("#highlight-title").fill(title);
  await page.locator("#highlight-video-url").fill(videoUrl);
  await page
    .locator("#highlight-thumbnail")
    .setInputFiles({ name: "thumb.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Highlight created.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toBeAttached();

  await page.goto("/");
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", videoUrl);
});

test("a highlight marked not visible is hidden from the homepage but still shown in the admin list", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Highlight Hidden ${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/highlights");

  await page.getByRole("button", { name: "New Highlight" }).click();
  await page.getByLabel("Platform").selectOption("YOUTUBE");
  await page.locator("#highlight-title").fill(title);
  await page.locator("#highlight-video-url").fill("https://www.youtube.com/watch?v=e2e-test");
  await page.getByLabel("Visible on homepage").uncheck();
  await page
    .locator("#highlight-thumbnail")
    .setInputFiles({ name: "thumb.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Highlight created.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(title) }).getByText("Hidden", { exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(title)).toHaveCount(0);
});

test("admin can update the TikTok/YouTube social links, and the homepage's buttons link to them", async ({ page }) => {
  const unique = Date.now();
  const tiktokUrl = `https://www.tiktok.com/@e2e-test-${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/highlights");

  await page.locator("#tiktok-profile-url").fill(tiktokUrl);
  await page.getByRole("button", { name: "Save links" }).click();
  await expect(page.getByText("Social links updated.")).toBeVisible();

  // The button only renders once at least one highlight exists for that
  // platform (see HighlightSection's `if (items.length === 0) return null`),
  // so create one to make the section (and its @HarakaGari button) visible.
  await page.getByRole("button", { name: "New Highlight" }).click();
  await page.getByLabel("Platform").selectOption("TIKTOK");
  await page.locator("#highlight-title").fill(`E2E Highlight Social ${unique}`);
  await page.locator("#highlight-video-url").fill(`https://www.tiktok.com/@e2e-test/video/${unique}`);
  await page
    .locator("#highlight-thumbnail")
    .setInputFiles({ name: "thumb.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Highlight created.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "@HarakaGari" }).first()).toHaveAttribute("href", tiktokUrl);
});

test("admin can delete a highlight, removing it from the homepage", async ({ page }) => {
  const unique = Date.now();
  const title = `E2E Highlight Delete ${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/highlights");

  await page.getByRole("button", { name: "New Highlight" }).click();
  await page.getByLabel("Platform").selectOption("TIKTOK");
  await page.locator("#highlight-title").fill(title);
  await page.locator("#highlight-video-url").fill("https://www.tiktok.com/@e2e-test/video/delete");
  await page
    .locator("#highlight-thumbnail")
    .setInputFiles({ name: "thumb.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Highlight created.")).toBeVisible();

  await page.getByRole("row", { name: new RegExp(title) }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Highlight deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText(title)).toHaveCount(0);
});
