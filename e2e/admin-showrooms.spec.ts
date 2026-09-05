import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Same fixture-account + serial-execution reasoning as admin-catalog.spec.ts
// — its own dedicated fixture email (distinct from other admin spec files'
// fixtures) and mode: "serial" to avoid two workers' beforeAll calls racing
// each other's password reset on the same account.
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = "e2e-admin-showrooms-fixture@harakagari.local";
const ADMIN_PASSWORD = "e2e-admin-showrooms-fixture-password-123";
const OWNER_EMAIL = "e2e-showroom-owner-fixture@harakagari.local";
const OWNER_PASSWORD = "e2e-showroom-owner-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run admin-showrooms E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const MAILPIT_URL = "http://127.0.0.1:54324";

// The invite email's real CTA isn't in msg.Text the way auth.spec.ts's
// confirmation/recovery links are (see getLatestEmailLink there) — it's an
// HTML button, so extract it from the href instead.
async function getLatestInviteLink(email: string): Promise<string> {
  const searchRes = await fetch(`${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(email)}`);
  const search = await searchRes.json();
  const latest = search.messages?.[0];
  if (!latest) throw new Error(`No invite email found for ${email}`);
  const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
  const msg = await msgRes.json();
  const hrefs = [...(msg.HTML as string).matchAll(/href="([^"]+)"/g)].map((m) => (m[1] ?? "").replace(/&amp;/g, "&"));
  const inviteLink = hrefs.find((h) => h.includes("type=invite"));
  if (!inviteLink) throw new Error(`No invite link found in email body: ${msg.HTML}`);
  return inviteLink;
}

let ownerUserId: string;

test.beforeAll(async () => {
  const supabase = admin();

  async function findFixtureUser(email: string) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data.users.find((u) => u.email === email);
  }

  let userId = (await findFixtureUser(ADMIN_EMAIL))?.id;
  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
    if (created.user) {
      userId = created.user.id;
    } else {
      userId = (await findFixtureUser(ADMIN_EMAIL))?.id;
      if (!userId) throw new Error(`Failed to create admin fixture user: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
  const { error: promoteError } = await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  if (promoteError) throw new Error(`Failed to promote admin fixture user: ${promoteError.message}`);

  // A single reusable "showroom owner" fixture — showrooms created for it
  // are cleaned up after each test, not the user itself, per showroom.spec.ts.
  // Given a real, known password (unlike a typical read-only fixture) so it
  // can also log in as an ordinary customer — used below to verify the
  // owner-search action rejects a non-admin caller directly, not just via
  // page-level gating.
  let existingOwnerId = (await findFixtureUser(OWNER_EMAIL))?.id;
  if (!existingOwnerId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: OWNER_EMAIL, password: OWNER_PASSWORD, email_confirm: true });
    if (created.user) {
      existingOwnerId = created.user.id;
    } else {
      existingOwnerId = (await findFixtureUser(OWNER_EMAIL))?.id;
      if (!existingOwnerId) throw new Error(`Failed to create showroom owner fixture: ${error?.message}`);
    }
  }
  await supabase.auth.admin.updateUserById(existingOwnerId, { password: OWNER_PASSWORD });
  ownerUserId = existingOwnerId;
});

test.afterEach(async () => {
  await admin().from("showrooms").delete().eq("owner_user_id", ownerUserId);
});

async function loginAsFixtureAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL("**/admin");
}

async function createPendingShowroom(businessName: string, withDocument = false) {
  const supabase = admin();
  const { data: showroom, error } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerUserId,
      business_name: businessName,
      phone: "+254712345678",
      email: `${businessName.toLowerCase().replace(/\s+/g, "-")}@example.com`,
      city: "Nairobi",
    })
    .select()
    .single();
  if (error || !showroom) throw error ?? new Error("showroom not created");

  if (withDocument) {
    const path = `${showroom.id}/license.pdf`;
    await supabase.storage.from("showroom-documents").upload(path, new Blob(["fake pdf"], { type: "application/pdf" }), { upsert: true });
    await supabase.from("showroom_documents").insert({
      showroom_id: showroom.id,
      document_type: "business_registration",
      storage_path: path,
      uploaded_by: ownerUserId,
    });
  }

  return showroom.id as string;
}

test("visiting /admin/showrooms while signed out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin/showrooms");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin can review a pending showroom, view its document, and approve it", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Showroom ${unique}`;
  await createPendingShowroom(businessName, true);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await expect(row).toBeAttached();
  await expect(row.getByText("Pending")).toBeVisible();

  await row.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Business Registration")).toBeVisible();

  // Viewing a document opens an inline preview within the same dialog, not
  // a new browser tab — assert no new page/tab opens and the preview
  // renders in place, then return to the details view.
  let newPageOpened = false;
  page.context().once("page", () => {
    newPageOpened = true;
  });
  await dialog.getByRole("button", { name: "View", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Back to details" })).toBeVisible();
  await expect(dialog.locator("iframe")).toBeVisible();
  expect(newPageOpened).toBe(false);
  await dialog.getByRole("button", { name: "Back to details" }).click();
  await expect(dialog.getByText("Business Registration")).toBeVisible();

  await dialog.getByRole("button", { name: "Approve" }).click();
  await dialog.getByRole("button", { name: "Yes, approve" }).click();
  await expect(page.getByText(`${businessName} approved.`)).toBeVisible();
  await expect(page.getByRole("row", { name: businessName }).getByText("Approved")).toBeVisible();
});

test("admin can reject a pending showroom", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Reject Showroom ${unique}`;
  await createPendingShowroom(businessName);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await row.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Reject" }).click();
  await dialog.getByRole("button", { name: "Yes, reject" }).click();
  await expect(page.getByText(`${businessName} rejected.`)).toBeVisible();
  await expect(page.getByRole("row", { name: businessName }).getByText("Rejected")).toBeVisible();
});

test("an approved or rejected showroom has no approve/reject actions in its review dialog", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Approved Showroom ${unique}`;
  const showroomId = await createPendingShowroom(businessName);
  await admin().from("showrooms").update({ status: "APPROVED", verified: true }).eq("id", showroomId);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await row.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Reject" })).toHaveCount(0);
});

test("admin can create a showroom for an existing user via the owner search", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Created Showroom ${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  await page.getByRole("button", { name: "New Showroom" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Search by email…").fill("e2e-showroom-owner-fixture");
  await expect(dialog.getByText("e2e-showroom-owner-fixture@harakagari.local").first()).toBeVisible();
  await dialog.getByText("e2e-showroom-owner-fixture@harakagari.local").first().click();

  await dialog.locator("#showroom-business-name").fill(businessName);
  await dialog.locator("#showroom-location").fill("Nairobi");
  await dialog.locator("#showroom-phone").fill("712345678");
  await dialog.locator("#showroom-email").fill(`${unique}@example.com`);
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Showroom created.")).toBeVisible();
  const row = page.getByRole("row", { name: businessName });
  await expect(row).toBeAttached();
  await expect(row.getByText("Pending")).toBeVisible();
});

// A minimal valid 1x1 PNG — real image bytes matter here since the browser
// actually renders it (an <img>/<Image> src pointed at garbage bytes would
// still attach to the DOM, silently masking a real "logo never uploaded"
// bug that a text-only fixture wouldn't catch).
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("admin can upload a logo when creating a showroom, shown in the row and the review dialog", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Logo Showroom ${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  await page.getByRole("button", { name: "New Showroom" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Search by email…").fill(OWNER_EMAIL.split("@")[0] ?? OWNER_EMAIL);
  await expect(dialog.getByText(OWNER_EMAIL).first()).toBeVisible();
  await dialog.getByText(OWNER_EMAIL).first().click();

  await dialog.locator("#showroom-business-name").fill(businessName);
  await dialog.locator("#showroom-logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
  await dialog.locator("#showroom-location").fill("Nairobi");
  await dialog.locator("#showroom-phone").fill("712345678");
  await dialog.locator("#showroom-email").fill(`${unique}@example.com`);
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Showroom created.")).toBeVisible();
  const row = page.getByRole("row", { name: businessName });
  await expect(row.locator("img")).toBeVisible();

  await row.getByRole("button", { name: "Review" }).click();
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();
});

test("admin can edit a showroom's business details", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Editable Showroom ${unique}`;
  const updatedName = `E2E Edited Showroom ${unique}`;
  await createPendingShowroom(businessName);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await row.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#showroom-business-name").fill(updatedName);
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Showroom updated.")).toBeVisible();
  await expect(page.getByRole("row", { name: updatedName })).toBeAttached();
});

test("rejects an invalid business email or phone client-side, without ever reaching the server", async ({ page }) => {
  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  await page.getByRole("button", { name: "New Showroom" }).click();
  let dialog = page.getByRole("dialog");
  // A fresh dialog must show no error at all — regression check for a real
  // bug found here: Dialog's own initial-focus effect was stealing focus
  // back from a field's autoFocus right after opening, triggering the
  // onBlur validation handler before the user ever interacted with it.
  await expect(dialog.getByText("Business name is required")).toHaveCount(0);

  await dialog.getByPlaceholder("Search by email…").fill(OWNER_EMAIL.split("@")[0] ?? OWNER_EMAIL);
  await expect(dialog.getByText(OWNER_EMAIL).first()).toBeVisible();
  await dialog.getByText(OWNER_EMAIL).first().click();

  const businessName = `E2E Invalid Input Showroom ${Date.now()}`;
  await dialog.locator("#showroom-business-name").fill(businessName);
  await dialog.locator("#showroom-location").fill("Nairobi");
  await dialog.locator("#showroom-phone").fill("12345");
  await dialog.locator("#showroom-email").fill("real@example.com");
  await dialog.getByRole("button", { name: "Create" }).click();
  // A real, styled application error — not the browser's native
  // type="email"/required tooltip, which this form deliberately opts out
  // of (noValidate). Exactly one instance — a regression check for a real
  // bug found here, where the same message was shown twice (once in a top
  // banner, once inline).
  await expect(dialog.getByText("Enter a valid phone number (e.g. 712345678)")).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("row", { name: businessName })).toHaveCount(0);

  await dialog.locator("#showroom-phone").fill("712345678");
  await dialog.locator("#showroom-email").fill("not-an-email");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText("Enter a valid email address")).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("row", { name: businessName })).toHaveCount(0);

  // Closing and reopening a fresh dialog must not show the previous
  // session's error either — regression check for stale
  // useFieldValidation state persisting across a dialog that stays
  // mounted between opens.
  await dialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "New Showroom" }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Enter a valid email address")).toHaveCount(0);
});

test("admin can delete a showroom", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Deletable Showroom ${unique}`;
  await createPendingShowroom(businessName);

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  const row = page.getByRole("row", { name: businessName });
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Showroom deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: businessName })).toHaveCount(0);
});

test("a signed-in customer cannot invoke the owner-search action directly to enumerate user emails", async ({ page, browser }) => {
  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");
  await page.getByRole("button", { name: "New Showroom" }).click();

  // Capture the real browser-generated Server Action request (headers +
  // raw body) for a legitimate admin search, so it can be byte-for-byte
  // replayed under a different, non-admin session below — this tests the
  // action's own server-side authorization, not just that the admin page
  // itself is gated (the /admin/(protected) layout guard doesn't protect a
  // Server Action's own endpoint from being invoked directly).
  const capturedRequestPromise = page.waitForRequest((req) => !!req.headers()["next-action"]);
  await page.getByPlaceholder("Search by email…").fill(OWNER_EMAIL.split("@")[0] ?? OWNER_EMAIL);
  const capturedRequest = await capturedRequestPromise;
  const capturedHeaders = capturedRequest.headers();
  const capturedBody = capturedRequest.postDataBuffer();

  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto("/login");
  await customerPage.getByLabel("Email address").fill(OWNER_EMAIL);
  await customerPage.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await customerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await customerPage.waitForURL("**/account");

  const replayHeaders = { ...capturedHeaders };
  delete replayHeaders.cookie;
  delete replayHeaders["content-length"];
  delete replayHeaders.host;

  const replay = await customerContext.request.post(capturedRequest.url(), {
    headers: replayHeaders,
    data: capturedBody ?? undefined,
  });
  const body = await replay.text();
  expect(body).not.toContain(OWNER_EMAIL);

  await customerContext.close();
});

test("admin can create a showroom for a brand-new owner, who receives an invite and can set up their account", async ({ page, browser }) => {
  const unique = Date.now();
  const businessName = `E2E Invited Owner Showroom ${unique}`;
  const ownerEmail = `e2e-invited-owner-${unique}@harakagari.local`;
  let newOwnerId: string | undefined;

  try {
    await loginAsFixtureAdmin(page);
    await page.goto("/admin/showrooms");

    await page.getByRole("button", { name: "New Showroom" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "New owner" }).click();
    await dialog.locator("#new-owner-name").fill("E2E Invited Owner");
    await dialog.locator("#new-owner-email").fill(ownerEmail);
    await dialog.locator("#new-owner-phone").fill("712345678");

    await dialog.locator("#showroom-business-name").fill(businessName);
    await dialog.locator("#showroom-documents").setInputFiles({
      name: "license.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });
    await dialog.locator("#showroom-location").fill("Nairobi");
    await dialog.locator("#showroom-phone").fill("722345678");
    await dialog.locator("#showroom-email").fill(`${unique}@example.com`);
    await dialog.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Showroom created.")).toBeVisible();
    const row = page.getByRole("row", { name: businessName });
    await expect(row).toBeAttached();

    const { data: showroom } = await admin().from("showrooms").select("id, owner_user_id").eq("business_name", businessName).single();
    if (!showroom) throw new Error("showroom not found after creation");
    newOwnerId = showroom.owner_user_id;
    const { data: documents } = await admin().from("showroom_documents").select("id").eq("showroom_id", showroom.id);
    expect(documents?.length).toBe(1);

    // The invited owner clicks their email link, sets a password, and
    // reaches their account — in a separate browser context, since they're
    // a different user than the admin.
    const inviteLink = await getLatestInviteLink(ownerEmail);
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(inviteLink);
    await ownerPage.waitForURL("**/reset-password");
    await ownerPage.getByLabel("New password", { exact: true }).fill("E2eInvitedOwner123!");
    await ownerPage.getByLabel("Confirm new password").fill("E2eInvitedOwner123!");
    await ownerPage.getByRole("button", { name: "Update password" }).click();
    await ownerPage.waitForURL("**/account");
    await expect(ownerPage.getByRole("heading", { name: "Welcome, E2E Invited Owner" })).toBeVisible();
    await ownerContext.close();
  } finally {
    if (newOwnerId) {
      await admin().from("showrooms").delete().eq("owner_user_id", newOwnerId);
      await admin().auth.admin.deleteUser(newOwnerId);
    }
  }
});

test("admin can attach documents when creating a showroom for an existing owner", async ({ page }) => {
  const unique = Date.now();
  const businessName = `E2E Existing Owner Docs Showroom ${unique}`;

  await loginAsFixtureAdmin(page);
  await page.goto("/admin/showrooms");

  await page.getByRole("button", { name: "New Showroom" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Search by email…").fill(OWNER_EMAIL.split("@")[0] ?? OWNER_EMAIL);
  await expect(dialog.getByText(OWNER_EMAIL).first()).toBeVisible();
  await dialog.getByText(OWNER_EMAIL).first().click();

  await dialog.locator("#showroom-business-name").fill(businessName);
  await dialog.locator("#showroom-documents").setInputFiles({
    name: "reg.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 fake pdf content"),
  });
  await dialog.locator("#showroom-location").fill("Mombasa");
  await dialog.locator("#showroom-phone").fill("733345678");
  await dialog.locator("#showroom-email").fill(`${unique}@example.com`);
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Showroom created.")).toBeVisible();

  const { data: showroom } = await admin().from("showrooms").select("id").eq("business_name", businessName).single();
  if (!showroom) throw new Error("showroom not found after creation");
  const { data: documents } = await admin().from("showroom_documents").select("id").eq("showroom_id", showroom.id);
  expect(documents?.length).toBe(1);
});
