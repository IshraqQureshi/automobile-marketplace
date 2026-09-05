import { test, expect } from "@playwright/test";

test("app shell loads", async ({ page }) => {
  await page.goto("/");
  // The homepage (MKT-001) has no literal "HarakaGari" <h1> — checks the
  // header logo (present regardless of DB state) and the hero's fixed
  // headline text instead.
  await expect(page.getByRole("img", { name: /HarakaGari/ }).first()).toBeVisible();
  await expect(page.getByText("The premium car marketplace", { exact: false })).toBeVisible();
});
