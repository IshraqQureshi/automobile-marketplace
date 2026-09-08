import { test, expect } from "@playwright/test";

// The public header's Brands/Model/Type nav dropdowns read straight from
// the real seeded catalog tables (brands/models/vehicle_types) — the same
// migration-seeded data other specs already rely on being present (see
// dashboard-vehicles.spec.ts's own "real seeded catalog (Toyota/Camry)"
// comment), not a per-test fixture this spec needs to create itself.

test("Brands dropdown navigates to /listing filtered by make", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Brands", exact: true }).click();
  const toyota = page.getByRole("menuitem", { name: "Toyota", exact: true });
  await expect(toyota).toBeVisible();
  await toyota.click();
  await page.waitForURL(/\/listing\?make=Toyota/);
  await expect(page.getByRole("heading", { name: "Browse Listing" })).toBeVisible();
});

test("Model dropdown labels items with their brand and navigates to /listing filtered by model", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Model", exact: true }).click();
  const camry = page.getByRole("menuitem", { name: "Toyota Camry" });
  await expect(camry).toBeVisible();
  await camry.click();
  await page.waitForURL(/\/listing\?model=Camry/);
});

test("Type dropdown routes a body shape through bodyType and a fuel type through fuelType", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sedan" }).click();
  await page.waitForURL(/\/listing\?bodyType=Sedan/);

  await page.goto("/");
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("menuitem", { name: "Diesel" }).click();
  // Diesel is one of FUEL_TYPES, not a body shape — must route through
  // fuelType (a different vehicles column) rather than bodyType, or it
  // would silently match zero vehicles.
  await page.waitForURL(/\/listing\?fuelType=Diesel/);
});

test("pressing Escape closes an open nav dropdown", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Brands", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Toyota", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Toyota", exact: true })).toBeHidden();
});

test("mobile menu's Brands disclosure opens and navigates to /listing filtered by make", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page.locator("details summary", { hasText: "Brands" }).click();
  const toyota = page.getByRole("link", { name: "Toyota", exact: true });
  await expect(toyota).toBeVisible();
  await toyota.click();
  await page.waitForURL(/\/listing\?make=Toyota/);
});
