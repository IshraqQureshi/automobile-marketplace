import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated admin fixture (per this repo's convention). Serial because
// the setting is a single global row — and always cleared afterwards, since
// a leftover snippet would inject into every other spec's public pages.
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const ADMIN_EMAIL = `e2e-head-scripts-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-head-scripts-admin-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run head-scripts E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function clearSetting() {
  await admin().from("system_settings").update({ value: "" }).eq("key", "custom_head_scripts");
}

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);
}

// Waits for hydration before the test touches the form — a click that lands
// before React attaches its submit handler becomes a native form submit (a
// page reload with no toast), the same race other specs in this repo guard
// against.
async function openSettings(page: import("@playwright/test").Page) {
  await page.goto("/admin/settings");
  await page.waitForLoadState("networkidle");
}

// The raw server response, not the hydrated DOM — Search Console and other
// verifiers read exactly this, and it proves the tags are in the initial
// <head>, not appended later by client JS.
async function headOf(request: import("@playwright/test").APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  return html.slice(0, html.indexOf("</head>"));
}

test.beforeAll(async () => {
  const supabase = admin();
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = data.users.find((u) => u.email === ADMIN_EMAIL)?.id;
  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
    if (!created.user) throw new Error(`Failed to create admin fixture: ${error?.message}`);
    userId = created.user.id;
  }
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", userId);
  await clearSetting();
});

test.afterAll(clearSetting);

test("an admin can save a head snippet, and it renders in the <head> of public pages only", async ({ page, request }) => {
  await loginAsAdmin(page);
  await openSettings(page);

  const marker = `verif-${unique}`;
  await page
    .getByLabel("Head snippet")
    .fill(
      `<meta name="google-site-verification" content="${marker}" />\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-E2E${unique}"></script>\n<script>window.__e2eHead = "${marker}";</script>`,
    );
  await page.getByRole("button", { name: "Save head scripts" }).click();
  await expect(page.getByText("Head scripts updated.")).toBeVisible();

  const publicHead = await headOf(request, "/");
  expect(publicHead).toContain(`content="${marker}"`);
  expect(publicHead).toContain(`G-E2E${unique}`);
  expect(publicHead).toContain(`window.__e2eHead = "${marker}"`);

  // The inline script actually executes in a real browser.
  await page.context().clearCookies();
  await page.goto("/");
  expect(await page.evaluate(() => (window as unknown as { __e2eHead?: string }).__e2eHead)).toBe(marker);

  // Not on the admin login, the showroom dashboard, or customer login.
  for (const path of ["/admin/login", "/dashboard", "/login"]) {
    expect(await headOf(request, path)).not.toContain(marker);
  }
});

test("a saved snippet persists in the settings form after reload", async ({ page }) => {
  await admin().from("system_settings").update({ value: '<meta name="persist-check" content="yes">' }).eq("key", "custom_head_scripts");
  await loginAsAdmin(page);
  await openSettings(page);
  await expect(page.getByLabel("Head snippet")).toHaveValue('<meta name="persist-check" content="yes">');
});

test("a snippet with a disallowed tag is rejected with a reason and not saved", async ({ page, request }) => {
  await clearSetting();
  await loginAsAdmin(page);
  await openSettings(page);

  await page.getByLabel("Head snippet").fill('<iframe src="https://evil.example/x"></iframe>');
  await page.getByRole("button", { name: "Save head scripts" }).click();
  await expect(page.getByText(/<iframe> isn't allowed/)).toBeVisible();

  const { data } = await admin().from("system_settings").select("value").eq("key", "custom_head_scripts").single();
  expect(data?.value).toBe("");
  expect(await headOf(request, "/")).not.toContain("evil.example");
});

test("clearing the field removes the injection", async ({ page, request }) => {
  await admin().from("system_settings").update({ value: '<meta name="to-remove" content="1">' }).eq("key", "custom_head_scripts");
  expect(await headOf(request, "/")).toContain("to-remove");

  await loginAsAdmin(page);
  await openSettings(page);
  await page.getByLabel("Head snippet").fill("");
  await page.getByRole("button", { name: "Save head scripts" }).click();
  await expect(page.getByText("Head scripts updated.")).toBeVisible();

  expect(await headOf(request, "/")).not.toContain("to-remove");
});
