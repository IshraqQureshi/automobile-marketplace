import { test, expect } from "@playwright/test";

// Regression coverage for a real client-reported bug: Header/Footer stay
// mounted across (site) navigations (only the page-content slot swaps —
// see src/app/(site)/loading.tsx's own comment), so clicking a link low on
// a long page (e.g. a footer catalog link) left the destination page
// mounting at whatever scroll offset the user already had, rather than at
// the top — footer stuck in view with no obvious loading feedback while
// the click was in flight, and no corrective scroll afterward either.
// Throttling the destination request below reproduces a real, perceptible
// navigation delay (the exact circumstance under which the bug was
// reported: "after a few seconds page loads but scroll remains on
// footer") rather than relying on a same-tick navigation too fast to
// expose the bug either way.
test("navigating via a footer link resets scroll to the top of the destination page, even on a slow navigation", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const link = page.locator("footer ul a").first();
  await link.waitFor({ state: "attached" });

  // The full, literal bottom of the page (not just "scroll the link into
  // view") — this is what actually exercises the bug: the destination
  // page's collapsed loading.tsx content is shorter than this scroll
  // offset, so the browser clamps scrollY to whatever fraction of that
  // shorter document it can, landing on a real but wrong non-zero value
  // rather than simply leaving scrollY unchanged.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const scrollBeforeClick = await page.evaluate(() => window.scrollY);
  expect(scrollBeforeClick).toBeGreaterThan(100);

  const href = await link.getAttribute("href");
  if (!href) throw new Error("expected a real footer catalog link (seeded brand/model/type data)");

  await page.route(`**${href}*`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });

  await link.click();
  await page.waitForURL(`**${href}`, { timeout: 8000 });
  await page.waitForLoadState("networkidle");

  // Asserted immediately, with no retry tolerance: the real bug wasn't a
  // permanently broken scroll reset (the browser eventually self-corrects
  // a couple of seconds later regardless), it was this exact multi-second
  // window right after the page "finishes loading" where the user is left
  // stranded on the footer looking at stale/old-position content — a
  // toPass retry loop would hide the regression by waiting it out.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
