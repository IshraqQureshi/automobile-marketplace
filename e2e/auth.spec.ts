import { test, expect } from "@playwright/test";

/**
 * AUTH-001/AUTH-002 E2E journey: registration → account → logout → login →
 * account, plus protected-route enforcement. Requires a running local
 * Supabase instance (see playwright.config.ts webServer, which builds and
 * starts the Next.js app pointed at it).
 */
test("customer can register, land on their account, log out, and log back in", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-customer-${unique}@example.com`;
  const password = "test-password-123";
  const fullName = `E2E Customer ${unique}`;

  await page.goto("/login");

  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

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
  await page.getByLabel("Password").fill(password);
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

  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("Duplicate Attempt");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("712345678");
  await page.getByLabel("Password").fill(password);
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
  await page.getByLabel("Password").fill("test-password-123");
  // Deliberately not checking the terms checkbox.
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/agree to the Terms of Service/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid login credentials are rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("no-such-user@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
