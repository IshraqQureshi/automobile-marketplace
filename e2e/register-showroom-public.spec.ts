import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Public (signed-out) showroom self-registration — reversed an earlier
// decision that made /register-showroom admin-only-reachable. Own
// dedicated fixture data per test (each creates and cleans up its own —
// no shared beforeAll/afterAll state), and deliberately NOT run in serial
// mode: these tests are fully independent of each other, and forcing
// serial execution would let one test's failure (e.g. the real-account
// happy path, which depends on the shared local Mailtrap sandbox actually
// having email quota left) silently skip every test after it, including
// the unrelated duplicate-email rejection check.
const MAILPIT_URL = "http://127.0.0.1:54324";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run register-showroom-public E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

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

test("the footer links to the public showroom registration page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sell your car" }).click();
  await page.waitForURL(/\/register-showroom$/);
  await expect(page.getByRole("heading", { name: "Register as Showroom" })).toBeVisible();
});

test("a signed-out visitor sees the full-name field the signed-in flow doesn't need", async ({ page }) => {
  await page.goto("/register-showroom");
  await expect(page.getByLabel("Your full name")).toBeVisible();
});

test("a signed-out visitor can register a new showroom — creating their account, an invite email, and a PENDING application", async ({
  page,
  browser,
}) => {
  const unique = Date.now();
  const ownerEmail = `e2e-public-register-${unique}@harakagari.local`;
  const businessName = `E2E Public Register Showroom ${unique}`;
  let newOwnerId: string | undefined;

  try {
    await page.goto("/register-showroom");
    await page.getByLabel("Your full name").fill("Public Applicant");
    await page.getByLabel("Business name").fill(businessName);
    await page.locator("#documents").setInputFiles({
      name: "license.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });
    await page.getByLabel("Location").fill("Nairobi");
    await page.getByLabel("Business phone").fill("712345678");
    await page.getByLabel("Business email").fill(ownerEmail);
    await page.getByRole("button", { name: "Submit Application" }).click();

    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    await expect(page.getByText("set your password")).toBeVisible();
    // No dashboard link — this applicant has no session yet.
    await expect(page.getByRole("link", { name: "Go to your dashboard →" })).toHaveCount(0);

    const supabase = admin();
    const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const newOwner = users.users.find((u) => u.email === ownerEmail);
    if (!newOwner) throw new Error("no auth user created for the public applicant");
    newOwnerId = newOwner.id;

    const { data: showroom } = await supabase.from("showrooms").select("id, status, owner_user_id").eq("business_name", businessName).single();
    expect(showroom?.status).toBe("PENDING");
    expect(showroom?.owner_user_id).toBe(newOwnerId);

    const { data: documents } = await supabase.from("showroom_documents").select("id").eq("showroom_id", showroom!.id);
    expect(documents?.length).toBe(1);

    // The applicant clicks their invite email's link, sets a password, and
    // reaches their new account — same flow as the admin-invited-owner
    // journey (e2e/admin-showrooms.spec.ts).
    const inviteLink = await getLatestInviteLink(ownerEmail);
    const applicantContext = await browser.newContext();
    const applicantPage = await applicantContext.newPage();
    await applicantPage.goto(inviteLink);
    await applicantPage.waitForURL("**/reset-password");
    await applicantPage.getByLabel("New password", { exact: true }).fill("E2ePublicApplicant123!");
    await applicantPage.getByLabel("Confirm new password").fill("E2ePublicApplicant123!");
    await applicantPage.getByRole("button", { name: "Update password" }).click();
    await applicantPage.waitForURL("**/account");
    await expect(applicantPage.getByRole("heading", { name: "Welcome, Public Applicant" })).toBeVisible();
    await applicantContext.close();
  } finally {
    if (newOwnerId) {
      await admin().from("showrooms").delete().eq("owner_user_id", newOwnerId);
      await admin().auth.admin.deleteUser(newOwnerId);
    }
  }
});

test("registering with an email that already has an account is rejected with a friendly message, not a new account", async ({ page }) => {
  const unique = Date.now();
  const existingEmail = `e2e-public-register-existing-${unique}@harakagari.local`;
  const supabase = admin();
  const { data: created } = await supabase.auth.admin.createUser({ email: existingEmail, password: `E2eExisting${unique}!`, email_confirm: true });

  try {
    await page.goto("/register-showroom");
    await page.getByLabel("Your full name").fill("Duplicate Applicant");
    await page.getByLabel("Business name").fill(`E2E Duplicate Showroom ${unique}`);
    await page.locator("#documents").setInputFiles({
      name: "license.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });
    await page.getByLabel("Location").fill("Nairobi");
    await page.getByLabel("Business phone").fill("712345679");
    await page.getByLabel("Business email").fill(existingEmail);
    await page.getByRole("button", { name: "Submit Application" }).click();

    await expect(page.getByText("An account with this email already exists")).toBeVisible();

    const { data: showroom } = await supabase.from("showrooms").select("id").eq("email", existingEmail).maybeSingle();
    expect(showroom).toBeNull();
  } finally {
    if (created.user) await admin().auth.admin.deleteUser(created.user.id);
  }
});
