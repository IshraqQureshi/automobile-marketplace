import { test, expect } from "@playwright/test";

// The public header's Brands/Model/Type nav dropdowns read straight from
// the real seeded catalog tables (brands/models/vehicle_types) — the same
// migration-seeded data other specs already rely on being present (see
// dashboard-vehicles.spec.ts's own "real seeded catalog (Toyota/Camry)"
// comment), not a per-test fixture this spec needs to create itself.

test("Brands dropdown navigates to the SEO-friendly /listing/{brand} page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Brands", exact: true }).click();
  const toyota = page.getByRole("menuitem", { name: "Toyota", exact: true });
  await expect(toyota).toBeVisible();
  await toyota.click();
  await page.waitForURL(/\/listing\/toyota$/);
  await expect(page.getByRole("heading", { name: "Toyota Cars for Sale in Kenya" })).toBeVisible();
});

test("Model dropdown labels items with their brand and navigates to the SEO-friendly /listing/{brand}/{model} page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Model", exact: true }).click();
  const camry = page.getByRole("menuitem", { name: "Toyota Camry" });
  await expect(camry).toBeVisible();
  await camry.click();
  await page.waitForURL(/\/listing\/toyota\/camry$/);
  await expect(page.getByRole("heading", { name: "Toyota Camry for Sale in Kenya" })).toBeVisible();
});

test("Type dropdown routes a body shape through /listing/type and a fuel type through /listing/fuel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sedan" }).click();
  await page.waitForURL(/\/listing\/type\/sedan$/);

  await page.goto("/");
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("menuitem", { name: "Diesel" }).click();
  // Diesel is one of FUEL_TYPES, not a body shape — must route through
  // /listing/fuel (a different vehicles column, fuel_type) rather than
  // /listing/type (body_type), or it would silently match zero vehicles.
  await page.waitForURL(/\/listing\/fuel\/diesel$/);
});

test("pressing Escape closes an open nav dropdown", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Brands", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Toyota", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Toyota", exact: true })).toBeHidden();
});

test("mobile menu's Brands disclosure opens and navigates to the SEO-friendly /listing/{brand} page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page.locator("details summary", { hasText: "Brands" }).click();
  const toyota = page.getByRole("link", { name: "Toyota", exact: true });
  await expect(toyota).toBeVisible();
  await toyota.click();
  await page.waitForURL(/\/listing\/toyota$/);
});

test("a curated brand with zero current listings still renders a real page, not a 404", async ({ page }) => {
  // Porsche is seeded in the brands catalog with no models and (per the
  // vehicle seed script) no live listings either — the SEO landing page
  // must still resolve via the catalog and show an honest empty state,
  // not 404 just because nothing is listed under it right now.
  const response = await page.goto("/listing/porsche", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Porsche Cars for Sale in Kenya" })).toBeVisible();
  await expect(page.getByText("No vehicles match your search")).toBeVisible();
});

test("an unresolvable brand slug renders not-found", async ({ page }) => {
  const response = await page.goto("/listing/not-a-real-brand-xyz", { waitUntil: "networkidle" });
  // KNOWN LIMITATION (pre-existing, app-wide — not introduced by this PR):
  // the root src/app/loading.tsx Suspense boundary flushes a 200 response
  // before a nested notFound() can turn into a real HTTP 404 (same gap
  // documented on the vehicle-detail page's own canonicalize-redirect,
  // B-009). The visible content is correct (the real not-found UI renders),
  // but a crawler sees 200, not 404, for every notFound() page in this app,
  // these new SEO routes included.
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an unresolvable model slug under a valid brand renders not-found", async ({ page }) => {
  await page.goto("/listing/toyota/not-a-real-model-xyz", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an unresolvable body type slug renders not-found", async ({ page }) => {
  await page.goto("/listing/type/not-a-real-type-xyz", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an unresolvable fuel type slug renders not-found", async ({ page }) => {
  await page.goto("/listing/fuel/not-a-real-fuel-xyz", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("a curated model with zero current listings still renders a real page, not a 404", async ({ page }) => {
  // Camry is seeded in the models catalog (under Toyota) but the seed
  // script's own Toyota vehicles are Hilux/Land Cruiser Prado, not Camry —
  // same "curated but currently empty" case as the Porsche brand test
  // above, one level deeper.
  const response = await page.goto("/listing/toyota/camry", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Toyota Camry for Sale in Kenya" })).toBeVisible();
  await expect(page.getByText("No vehicles match your search")).toBeVisible();
});

test("submitting the filter form on an SEO landing page with zero current listings preserves its own filter", async ({ page }) => {
  // Regression test for a real bug found in code review: the "Model"
  // <select> didn't include "Camry" as an option (derived only from real
  // current listings), so its defaultValue silently fell back to unselected
  // — and because the filter form used to always submit to a hardcoded
  // /listing, resubmitting it (e.g. to change price) silently dropped the
  // Camry filter entirely, not just the pretty URL.
  await page.goto("/listing/toyota/camry", { waitUntil: "networkidle" });
  await expect(page.locator("#vehicle-filter-make")).toHaveValue("Toyota");
  await expect(page.locator("#vehicle-filter-model")).toHaveValue("Camry");

  await page.locator("#vehicle-min-price").fill("100000");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL(/\/listing\/toyota\/camry\?/);
  expect(page.url()).toContain("make=Toyota");
  expect(page.url()).toContain("model=Camry");
});

test("the old flat query-string URLs still work (not broken by the SEO route change)", async ({ page }) => {
  await page.goto("/listing?make=Toyota", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Browse Listing" })).toBeVisible();
  await expect(page.locator("#vehicle-filter-make")).toHaveValue("Toyota");
});
