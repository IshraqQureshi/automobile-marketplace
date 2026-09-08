import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { getShowroomDetailPath } from "../src/features/showroom/slug";

// Homepage certified-showrooms marquee — each real card should link to
// that showroom's own public detail page (previously decorative/non-linked).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const SHOWROOM_NAME = `E2E Marquee Showroom ${unique}`;

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run homepage-marquee E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// The marquee itself only renders once at least 10 real APPROVED showrooms
// exist (src/app/(site)/page.tsx's own MIN_SHOWROOMS_FOR_MARQUEE) — this
// test previously relied on that threshold being incidentally satisfied by
// whatever other real/fixture showrooms happened to already exist in the
// dev database, which is exactly the kind of ambient-state dependency that
// breaks the moment someone cleans up stale fixture data (confirmed live:
// this test started failing once leftover E2E showrooms from other spec
// files were cleaned up). Made self-sufficient instead — top up to the
// threshold with its own disposable fixture showrooms, regardless of
// whatever else exists.
const MIN_SHOWROOMS_FOR_MARQUEE = 10;

let ownerId: string;
let showroomId: string;
let showroomPath: string;
const fillerShowroomIds: string[] = [];
const fillerOwnerIds: string[] = [];

test.beforeAll(async () => {
  const supabase = admin();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: `e2e-marquee-owner-${unique}@harakagari.local`,
    password: "e2e-marquee-owner-fixture-password-123",
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("fixture owner not created");
  ownerId = created.user.id;

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: SHOWROOM_NAME,
      phone: "+254712345690",
      email: `e2e-marquee-${unique}@example.com`,
      status: "APPROVED",
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;
  showroomPath = getShowroomDetailPath({ id: showroomId, businessName: SHOWROOM_NAME });

  const { count } = await supabase.from("showrooms").select("id", { count: "exact", head: true }).eq("status", "APPROVED");
  const shortfall = Math.max(0, MIN_SHOWROOMS_FOR_MARQUEE - (count ?? 0));
  for (let i = 0; i < shortfall; i++) {
    const { data: fillerOwner, error: fillerOwnerError } = await supabase.auth.admin.createUser({
      email: `e2e-marquee-filler-owner-${unique}-${i}@harakagari.local`,
      password: "e2e-marquee-filler-owner-fixture-password-123",
      email_confirm: true,
    });
    if (fillerOwnerError || !fillerOwner.user) throw fillerOwnerError ?? new Error("filler owner not created");
    fillerOwnerIds.push(fillerOwner.user.id);

    const { data: fillerShowroom, error: fillerShowroomError } = await supabase
      .from("showrooms")
      .insert({
        owner_user_id: fillerOwner.user.id,
        business_name: `E2E Marquee Filler ${unique} ${i}`,
        phone: `+25471234${String(5700 + i).padStart(4, "0")}`,
        email: `e2e-marquee-filler-${unique}-${i}@example.com`,
        status: "APPROVED",
      })
      .select("id")
      .single();
    if (fillerShowroomError || !fillerShowroom) throw fillerShowroomError ?? new Error("filler showroom not created");
    fillerShowroomIds.push(fillerShowroom.id);
  }
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("showrooms").delete().eq("id", showroomId);
  await supabase.auth.admin.deleteUser(ownerId);
  for (const id of fillerShowroomIds) await supabase.from("showrooms").delete().eq("id", id);
  for (const id of fillerOwnerIds) await supabase.auth.admin.deleteUser(id);
});

test("a certified-showroom marquee card links to that showroom's real detail page", async ({ page }) => {
  await page.goto("/");

  // The track's own CSS animation continuously moves every card, which
  // Playwright's actionability check correctly treats as "not stable" for a
  // real click — disabling animations here doesn't change what's being
  // tested (the real href/navigation), it just stops the element from
  // visually moving out from under the click.
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; }" });

  // Only the real (non-duplicate) card set is a real link — the CSS-marquee
  // loop's duplicate set is plain, non-interactive divs (see hero-search.tsx).
  const link = page.getByRole("link", { name: SHOWROOM_NAME });
  await expect(link).toHaveAttribute("href", showroomPath);
  await link.click();
  await expect(page.getByRole("heading", { name: SHOWROOM_NAME, exact: true })).toBeVisible();
});
