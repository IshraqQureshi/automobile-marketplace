import { test, expect } from "@playwright/test";

// Verifies every application/ld+json <script> on each major public page
// parses as valid JSON and carries the expected @type — real seeded data
// (Toyota/Hilux, HarakaGari Test Motors), same fixtures other specs
// already rely on being present.

function parseJsonLdBlocks(scripts: string[]): object[] {
  return scripts.map((s) => JSON.parse(s));
}

test("homepage renders WebSite (with SearchAction) and Organization JSON-LD", async ({ page }) => {
  await page.goto("/");
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const blocks = parseJsonLdBlocks(scripts) as Array<Record<string, unknown>>;

  const website = blocks.find((b) => b["@type"] === "WebSite");
  expect(website).toBeTruthy();
  expect((website?.potentialAction as Record<string, unknown> | undefined)?.["@type"]).toBe("SearchAction");

  const organization = blocks.find((b) => b["@type"] === "Organization");
  expect(organization).toBeTruthy();
  expect(organization?.name).toBe("HarakaGari");
});

test("a listing page renders an ItemList of real vehicles", async ({ page }) => {
  await page.goto("/listing/toyota");
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const blocks = parseJsonLdBlocks(scripts) as Array<Record<string, unknown>>;

  const itemList = blocks.find((b) => b["@type"] === "ItemList");
  expect(itemList).toBeTruthy();
  const elements = itemList?.itemListElement as Array<Record<string, unknown>>;
  expect(elements.length).toBeGreaterThan(0);
  const firstItem = elements[0]?.item as Record<string, unknown>;
  expect(firstItem["@type"]).toBe("Product");
  expect((firstItem.offers as Record<string, unknown>)?.priceCurrency).toBe("KES");
});

test("the showrooms directory renders an ItemList of real showrooms", async ({ page }) => {
  await page.goto("/showrooms");
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const blocks = parseJsonLdBlocks(scripts) as Array<Record<string, unknown>>;
  const itemList = blocks.find((b) => b["@type"] === "ItemList");
  expect(itemList).toBeTruthy();
  expect((itemList?.itemListElement as unknown[]).length).toBeGreaterThan(0);
});

test("a vehicle detail page renders Vehicle (with seller) and a matching BreadcrumbList", async ({ page }) => {
  await page.goto("/listing/toyota");
  const firstVehicleLink = page.locator('a[href^="/toyota/"]').first();
  const href = await firstVehicleLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);

  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const blocks = parseJsonLdBlocks(scripts) as Array<Record<string, unknown>>;

  const vehicle = blocks.find((b) => b["@type"] === "Vehicle");
  expect(vehicle).toBeTruthy();
  expect(vehicle?.brand).toBe("Toyota");
  expect((vehicle?.seller as Record<string, unknown> | undefined)?.["@type"]).toBe("AutoDealer");

  const breadcrumb = blocks.find((b) => b["@type"] === "BreadcrumbList");
  expect(breadcrumb).toBeTruthy();
  const crumbs = breadcrumb?.itemListElement as Array<Record<string, unknown>>;
  expect(crumbs[0]?.name).toBe("Home");
  // Last crumb must be the current page itself, matching the visible
  // breadcrumb nav (schema.org's own guidance: structured data should
  // reflect real, visible page content).
  expect(crumbs[crumbs.length - 1]?.item).toContain(href);
});

test("a showroom detail page renders AutoDealer and a matching BreadcrumbList, with a real visible breadcrumb nav", async ({ page }) => {
  await page.goto("/showrooms");
  const firstShowroomLink = page.locator('a[href^="/showrooms/"]').first();
  const href = await firstShowroomLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);

  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();

  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const blocks = parseJsonLdBlocks(scripts) as Array<Record<string, unknown>>;

  const autoDealer = blocks.find((b) => b["@type"] === "AutoDealer");
  expect(autoDealer).toBeTruthy();
  expect(autoDealer?.telephone).toBeTruthy();

  const breadcrumb = blocks.find((b) => b["@type"] === "BreadcrumbList");
  expect(breadcrumb).toBeTruthy();
  const crumbs = breadcrumb?.itemListElement as Array<Record<string, unknown>>;
  expect(crumbs[crumbs.length - 1]?.item).toContain(href);
});
