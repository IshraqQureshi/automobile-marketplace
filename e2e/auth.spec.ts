import { test, expect } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

/**
 * Fetches the most recent email sent to `email` from the local Mailpit
 * instance and extracts the first link in its plain-text body. Used to
 * drive real signup-confirmation and password-reset flows end-to-end,
 * rather than stubbing the email step.
 */
async function getLatestEmailLink(email: string): Promise<string> {
  const searchRes = await fetch(`${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(email)}`);
  const search = await searchRes.json();
  // Mailpit's search returns newest-first — [0] is the most recent message,
  // which matters when a test sends this address more than one email (e.g.
  // a signup confirmation followed later by a password-reset request).
  const latest = search.messages?.[0];
  if (!latest) throw new Error(`No email found for ${email}`);

  const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
  const msg = await msgRes.json();
  const match = (msg.Text as string).match(/\(\s*(http\S+)\s*\)/);
  const link = match?.[1];
  if (!link) throw new Error(`No link found in email body: ${msg.Text}`);
  return link;
}

/**
 * AUTH-001/AUTH-002 E2E journey: registration → email confirmation → account
 * → logout → login → account, plus protected-route enforcement. Requires a
 * running local Supabase instance (see playwright.config.ts webServer, which
 * builds and starts the Next.js app pointed at it) with Mailpit capturing
 * outgoing auth emails (auth.email.enable_confirmations = true).
 */
test("customer can register, confirm their email, land on their account, log out, and log back in", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `e2e-customer-${unique}@example.com`;
  const password = "test-password-123";
  const fullName = `E2E Customer ${unique}`;

  await page.goto("/login");

  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("0712 345 678");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/check your email to confirm/i)).toBeVisible();

  const confirmLink = await getLatestEmailLink(email);
  await page.goto(confirmLink);

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: `Welcome, ${fullName}` })).toBeVisible();
  await expect(page.getByText(email, { exact: false })).toBeVisible();
  await expect(page.getByText("role: CUSTOMER")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Protected route rejects an unauthenticated visitor.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);

  // Log back in with the same credentials.
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: `Welcome, ${fullName}` })).toBeVisible();
});

test("duplicate email registration is rejected", async ({ page, request }) => {
  const unique = Date.now();
  const email = `e2e-dup-${unique}@example.com`;
  const password = "test-password-123";

  // Register once directly against the local GoTrue API to seed the
  // duplicate — faster than driving the UI twice for fixture setup.
  await request.post("http://127.0.0.1:54321/auth/v1/signup", {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    data: { email, password },
  });

  // The duplicate-email check only applies to a *confirmed* account — GoTrue
  // treats a second signUp for an unconfirmed address as a legitimate
  // "resend confirmation" and responds with success, not an error. Confirm
  // the seeded account first so the real duplicate-email path is exercised.
  await page.goto(await getLatestEmailLink(email));

  // GoTrue's auth.email.max_frequency ("1s") throttles a second confirmation
  // email to the same address — the UI attempt below tries to send one too,
  // so without this wait it hits the throttle instead of the actual
  // duplicate-email check.
  await page.waitForTimeout(1200);

  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("Duplicate Attempt");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/already exists/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("registration is rejected without agreeing to the Terms of Service", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-noterms-${unique}@example.com`;

  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("No Terms");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByLabel("Confirm password").fill("test-password-123");
  // Deliberately not checking the terms checkbox.
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("You must agree to the Terms of Service and Privacy Policy")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("registration is rejected when the passwords don't match", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-mismatch-${unique}@example.com`;

  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("Mismatch Attempt");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  // Check the box before touching the password fields — checking it later,
  // right after a blur-triggered validation re-render, was flaky.
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("checkbox")).toBeChecked();

  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByLabel("Confirm password").fill("different-password-456");

  // The live on-blur check should surface this before the button is even
  // clicked — blur out of the confirm-password field to prove it.
  await page.getByLabel("Full name").focus();
  await expect(page.getByText("Passwords do not match")).toBeVisible();

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid login credentials are rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("no-such-user@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("password field has a working show/hide toggle", async ({ page }) => {
  await page.goto("/login");

  const passwordInput = page.getByLabel("Password", { exact: true });
  await passwordInput.fill("some-password");
  await expect(passwordInput).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");

  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");
});

test("customer can reset a forgotten password end-to-end", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-reset-${unique}@example.com`;
  const originalPassword = "original-password-123";
  const newPassword = "brand-new-password-456";

  // Register and confirm a real account first, so there's a real password to reset.
  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("Reset Flow");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByLabel("Confirm password").fill(originalPassword);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/check your email to confirm/i)).toBeVisible();
  await page.goto(await getLatestEmailLink(email));
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("button", { name: "Log out" }).click();

  // Request a reset link.
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/we've sent a password reset link/i)).toBeVisible();

  // Follow the emailed link and set a new password.
  const resetLink = await getLatestEmailLink(email);
  await page.goto(resetLink);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("button", { name: "Log out" }).click();

  // The old password no longer works; the new one does.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  // React resets uncontrolled form fields after every action dispatch
  // (success or failure), so the email field must be re-filled too, not
  // just the password.
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("visiting the reset-password page without a valid recovery session shows an expired-link message", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Link expired or invalid" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
});
