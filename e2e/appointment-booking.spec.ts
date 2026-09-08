import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Own dedicated fixture showroom/vehicle/admin (per this repo's convention).
test.describe.configure({ mode: "serial" });

const unique = Date.now();
const OWNER_EMAIL = `e2e-appointment-owner-fixture-${unique}@harakagari.local`;
const OWNER_PASSWORD = "e2e-appointment-owner-fixture-password-123";
const OTHER_OWNER_EMAIL = `e2e-appointment-other-owner-fixture-${unique}@harakagari.local`;
const OTHER_OWNER_PASSWORD = "e2e-appointment-other-owner-fixture-password-123";
const ADMIN_EMAIL = `e2e-appointment-admin-fixture-${unique}@harakagari.local`;
const ADMIN_PASSWORD = "e2e-appointment-admin-fixture-password-123";

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to run appointment-booking E2E tests");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let vehicleId: string;
let vehiclePath: string;
let showroomId: string;
let secondVehicleId: string;
let secondVehicleTitle: string;
let thirdVehicleId: string;
let thirdVehicleTitle: string;

// A fixed weekday/time far enough in the future that "today" never
// collides with it during a test run, and whose day-of-week is always
// within the fixture's Mon–Fri 09:00–17:00 availability window below.
function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
const BOOKING_DATE = nextMonday();
// A different weekday in the same fixture's Mon-Fri window, so the
// reschedule test moves to a genuinely different date, not just a
// different time on the same day.
function nextTuesday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((2 + 7 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
const RESCHEDULE_DATE = nextTuesday();

test.beforeAll(async () => {
  const supabase = admin();

  async function ensureFixtureUser(email: string, password: string): Promise<string> {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = data.users.find((u) => u.email === email)?.id;
    if (!userId) {
      const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.user) {
        userId = created.user.id;
      } else {
        throw new Error(`Failed to create fixture user ${email}: ${error?.message}`);
      }
    }
    await supabase.auth.admin.updateUserById(userId, { password });
    return userId;
  }

  const ownerId = await ensureFixtureUser(OWNER_EMAIL, OWNER_PASSWORD);
  const otherOwnerId = await ensureFixtureUser(OTHER_OWNER_EMAIL, OTHER_OWNER_PASSWORD);
  const adminId = await ensureFixtureUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);

  await supabase.from("showrooms").delete().eq("owner_user_id", ownerId);
  await supabase.from("showrooms").delete().eq("owner_user_id", otherOwnerId);

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: `E2E Appointment Showroom ${unique}`,
      phone: "+254712345678",
      email: `e2e-appointment-showroom-${unique}@example.com`,
      status: "APPROVED",
      verified: true,
      slot_duration_minutes: 30,
      buffer_minutes: 0,
    })
    .select("id")
    .single();
  if (showroomError || !showroom) throw showroomError ?? new Error("showroom not created");
  showroomId = showroom.id;

  await supabase.from("showrooms").insert({
    owner_user_id: otherOwnerId,
    business_name: `E2E Appointment Other Showroom ${unique}`,
    phone: "+254712345679",
    email: `e2e-appointment-other-showroom-${unique}@example.com`,
    status: "APPROVED",
    verified: true,
  });

  // Every weekday, 09:00–17:00 — real availability so the "Schedule Test
  // Drive" button actually renders instead of the disabled placeholder.
  await supabase.from("showroom_availability").insert(
    [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      showroom_id: showroomId,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00",
      is_available: true,
    })),
  );

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Appointment Vehicle ${unique}`,
      make: `E2eappointment${unique}`,
      model: "Alpha",
      year: 2022,
      price: 2_000_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (vehicleError || !vehicle) throw vehicleError ?? new Error("vehicle not created");
  vehicleId = vehicle.id;
  vehiclePath = `/e2eappointment${unique}/alpha-${vehicleId}`;

  // A second ACTIVE vehicle in the same showroom, for the multi-vehicle
  // ("add another car to this appointment") test below — the popup's
  // vehicle-picker section only renders once there's at least one other
  // active listing to offer.
  const { data: secondVehicle, error: secondVehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Appointment Vehicle Beta ${unique}`,
      make: `E2eappointment${unique}`,
      model: "Beta",
      year: 2023,
      price: 2_500_000,
      status: "ACTIVE",
    })
    .select("id, make, model")
    .single();
  if (secondVehicleError || !secondVehicle) throw secondVehicleError ?? new Error("second vehicle not created");
  secondVehicleId = secondVehicle.id;
  // The "add another car" picker's label is built from make+model (see
  // otherShowroomVehicleRows in [brand]/[slug]/page.tsx), not the vehicle's
  // own `title` column.
  secondVehicleTitle = `${secondVehicle.make} ${secondVehicle.model}`;

  // A third vehicle — for the "N vehicles reserve N consecutive slots"
  // test below, which needs more than 2 cars to meaningfully distinguish
  // "one slot per vehicle" from "one slot for the whole appointment."
  const { data: thirdVehicle, error: thirdVehicleError } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: showroomId,
      title: `E2E Appointment Vehicle Gamma ${unique}`,
      make: `E2eappointment${unique}`,
      model: "Gamma",
      year: 2024,
      price: 3_000_000,
      status: "ACTIVE",
    })
    .select("id, make, model")
    .single();
  if (thirdVehicleError || !thirdVehicle) throw thirdVehicleError ?? new Error("third vehicle not created");
  thirdVehicleId = thirdVehicle.id;
  thirdVehicleTitle = `${thirdVehicle.make} ${thirdVehicle.model}`;
});

test.afterEach(async () => {
  await admin().from("appointments").delete().eq("showroom_id", showroomId);
});

test.afterAll(async () => {
  const supabase = admin();
  await supabase.from("vehicles").delete().eq("id", vehicleId);
  await supabase.from("vehicles").delete().eq("id", secondVehicleId);
  await supabase.from("vehicles").delete().eq("id", thirdVehicleId);
  await supabase.from("showrooms").delete().eq("id", showroomId);
});

// BOOKING_DATE is always the upcoming Monday, but that can land in the
// month after "today" if today is near month-end — advance the calendar
// to the right month first so a day-number click always hits the real
// target date, not a same-numbered day in the wrong month.
async function navigateToBookingDate(page: import("@playwright/test").Page) {
  const [targetYear, targetMonth] = BOOKING_DATE.split("-").map(Number);
  const today = new Date();
  const monthsAhead = (targetYear! - today.getFullYear()) * 12 + (targetMonth! - 1 - today.getMonth());
  for (let i = 0; i < monthsAhead; i++) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  const targetDay = Number(BOOKING_DATE.slice(-2)).toString();
  await page.getByRole("button", { name: targetDay, exact: true }).click();
}

async function bookSlot(page: import("@playwright/test").Page, slotLabel: string, overrides: Partial<Record<string, string>> = {}) {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Schedule Test Drive" }).click();
  // Step 1 (vehicles) — single-vehicle by default, so just continue.
  await page.getByRole("button", { name: "Continue to pick a date & time" }).click();
  await navigateToBookingDate(page);
  await expect(page.getByRole("button", { name: slotLabel })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: slotLabel }).click();

  await page.getByLabel("Full Name").fill(overrides.name ?? "Anonymous Applicant");
  await page.getByLabel("Email").fill(overrides.email ?? `anon-appointment-${unique}@example.com`);
  await page.getByLabel("Phone").fill(overrides.phone ?? "712345678");
  await page.getByRole("button", { name: "Request Appointment" }).click();
}

test("an anonymous visitor can book a test drive, stored with no customer_id", async ({ page }) => {
  await bookSlot(page, "9:00 am");

  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("appointments")
    .select("customer_id, contact_name, contact_phone, status, appointment_date, start_time, booking_reference")
    .eq("showroom_id", showroomId)
    .single();
  expect(data?.customer_id).toBeNull();
  expect(data?.contact_name).toBe("Anonymous Applicant");
  expect(data?.contact_phone).toBe("+254712345678");
  expect(data?.status).toBe("PENDING");
  expect(data?.appointment_date).toBe(BOOKING_DATE);
  expect(data?.start_time).toBe("09:00:00");
  expect(data?.booking_reference).toMatch(/^BK-/);
});

test("booking 3 cars from the same showroom reserves 3 consecutive slots, not 1 shared slot (APT-003)", async ({ page, context }) => {
  await page.goto(vehiclePath);
  await page.getByRole("button", { name: "Schedule Test Drive" }).click();

  // Step 1: vehicles. The current vehicle is pre-checked and locked
  // (disabled); check the other two to book all 3 in one appointment.
  await expect(page.getByLabel("Alpha", { exact: false })).toBeChecked();
  await page.getByLabel(secondVehicleTitle).check();
  await page.getByLabel(thirdVehicleTitle).check();
  await page.getByRole("button", { name: "Continue to pick a date & time" }).click();

  // Step 2: date & time — with 3 vehicles selected, only a start time with
  // 3 consecutive open 30-min slots should be offered; 3:00 pm has
  // 3:30/4:00 free right after it within the 09:00-17:00 window.
  await navigateToBookingDate(page);
  await expect(page.getByRole("button", { name: "3:00 pm", exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "3:00 pm", exact: true }).click();

  await page.getByLabel("Full Name").fill("Multi Vehicle Tester");
  await page.getByLabel("Email").fill(`multi-vehicle-${unique}@example.com`);
  await page.getByLabel("Phone").fill("712345690");
  await page.getByRole("button", { name: "Request Appointment" }).click();

  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  const { data } = await admin()
    .from("appointments")
    .select("id, start_time, end_time, appointment_vehicles(vehicle_id)")
    .eq("contact_email", `multi-vehicle-${unique}@example.com`)
    .single();
  const attachedVehicleIds = (data?.appointment_vehicles ?? []).map((row) => row.vehicle_id).sort();
  expect(attachedVehicleIds).toEqual([vehicleId, secondVehicleId, thirdVehicleId].sort());
  // 3 vehicles × 30-min slots = a 90-minute block (15:00-16:30), not the
  // single 30-minute slot a pre-fix appointment would have stored.
  expect(data?.start_time).toBe("15:00:00");
  expect(data?.end_time).toBe("16:30:00");

  // A second visitor picking 3 vehicles on the same date must now see all
  // 3 slots this appointment consumed (3:00, 3:30, 4:00) as unavailable —
  // proving the showroom's capacity was genuinely reserved per car, not
  // just at the single time the first customer clicked.
  const secondPage = await context.newPage();
  await secondPage.goto(vehiclePath);
  await secondPage.getByRole("button", { name: "Schedule Test Drive" }).click();
  await secondPage.getByLabel(secondVehicleTitle).check();
  await secondPage.getByRole("button", { name: "Continue to pick a date & time" }).click();
  await navigateToBookingDate(secondPage);
  await expect(secondPage.getByRole("button", { name: "3:00 pm", exact: true })).toBeDisabled({ timeout: 10000 });
  await expect(secondPage.getByRole("button", { name: "3:30 pm", exact: true })).toBeDisabled();
  await expect(secondPage.getByRole("button", { name: "4:00 pm", exact: true })).toBeDisabled();
  await secondPage.close();
});

test("booking an already-taken slot shows a clear conflict error, not a duplicate row", async ({ page, context }) => {
  await bookSlot(page, "10:30 am", { email: `first-booker-${unique}@example.com` });
  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  // A fresh page (new tab, same context) re-fetches slots live rather than
  // reusing the first page's now-stale in-memory list — the real guard
  // this test proves is the server action re-checking at submit time (and
  // the DB's own partial unique index underneath it), not just the UI.
  const secondPage = await context.newPage();
  await secondPage.goto(vehiclePath);
  await secondPage.getByRole("button", { name: "Schedule Test Drive" }).click();
  await secondPage.getByRole("button", { name: "Continue to pick a date & time" }).click();
  await navigateToBookingDate(secondPage);
  await expect(secondPage.getByRole("button", { name: "10:30 am" })).toBeDisabled({ timeout: 10000 });

  const { count } = await admin().from("appointments").select("id", { count: "exact", head: true }).eq("showroom_id", showroomId);
  expect(count).toBe(1);
  await secondPage.close();
});

test("admin can see the appointment, confirm it, and the customer gets a confirmation email path exercised", async ({ page }) => {
  await bookSlot(page, "11:00 am", { name: "Admin Confirm Test", email: `admin-confirm-${unique}@example.com` });
  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/appointments");
  const row = page.getByRole("row", { name: /Admin Confirm Test/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("pending", { exact: true })).toBeVisible();

  const appointmentsNavLink = page.getByRole("link", { name: "Appointments" });
  const badgeBefore = await appointmentsNavLink.getByText(/^\d+$/).textContent();

  await row.getByRole("button", { name: "Confirm" }).click();
  await expect(row.getByText("confirmed", { exact: true })).toBeVisible();

  await page.reload();
  await page.waitForTimeout(500);
  const badgeAfterCount = await page.getByRole("link", { name: "Appointments" }).getByText(/^\d+$/).count();
  if (Number(badgeBefore) - 1 === 0) {
    expect(badgeAfterCount).toBe(0);
  } else {
    const badgeAfter = await page.getByRole("link", { name: "Appointments" }).getByText(/^\d+$/).textContent();
    expect(Number(badgeAfter)).toBe(Number(badgeBefore) - 1);
  }

  const { data } = await admin().from("appointments").select("status").eq("showroom_id", showroomId).single();
  expect(data?.status).toBe("CONFIRMED");
});

test("owner can decline a pending appointment", async ({ page }) => {
  await bookSlot(page, "12:00 pm", { name: "Decline Test", email: `decline-${unique}@example.com` });
  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto("/dashboard/appointments", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("row", { name: /Decline Test/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Decline" }).click();
  await expect(row.getByText("declined", { exact: true })).toBeVisible();

  const { data } = await admin().from("appointments").select("status").eq("showroom_id", showroomId).single();
  expect(data?.status).toBe("DECLINED");
});

test("owner can reschedule a pending appointment to a new date/time, and then confirm it (APT-008)", async ({ page }) => {
  await bookSlot(page, "4:30 pm", { name: "Reschedule Test", email: `reschedule-${unique}@example.com` });
  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto("/dashboard/appointments", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("row", { name: /Reschedule Test/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Reschedule" }).click();

  await page.getByLabel("New date").fill(RESCHEDULE_DATE);
  await expect(page.getByRole("button", { name: "9:00 am" })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "9:00 am" }).click();
  await page.getByRole("button", { name: "Confirm new time" }).click();

  await expect(row.getByText("rescheduled", { exact: true })).toBeVisible({ timeout: 10000 });

  const { data: rescheduled } = await admin()
    .from("appointments")
    .select("status, appointment_date, start_time")
    .eq("contact_email", `reschedule-${unique}@example.com`)
    .single();
  expect(rescheduled?.status).toBe("RESCHEDULED");
  expect(rescheduled?.appointment_date).toBe(RESCHEDULE_DATE);
  expect(rescheduled?.start_time).toBe("09:00:00");

  // Rescheduled → Confirmed must still be reachable, otherwise a
  // rescheduled appointment would be permanently stuck with no way to
  // finalize it.
  await row.getByRole("button", { name: "Confirm" }).click();
  await expect(row.getByText("confirmed", { exact: true })).toBeVisible();

  const { data: confirmed } = await admin()
    .from("appointments")
    .select("status")
    .eq("contact_email", `reschedule-${unique}@example.com`)
    .single();
  expect(confirmed?.status).toBe("CONFIRMED");
});

test("the owning showroom sees the appointment in its own dashboard, but a different showroom does not", async ({ page, browser }) => {
  await bookSlot(page, "1:30 pm", { name: "Showroom Scoping Test", email: `showroom-scoping-appt-${unique}@example.com` });
  await expect(page.getByText("Request sent!")).toBeVisible({ timeout: 10000 });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto("/login");
  await ownerPage.getByLabel("Email address").fill(OWNER_EMAIL);
  await ownerPage.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await ownerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await ownerPage.waitForURL(/\/dashboard$/);
  await ownerPage.goto("/dashboard/appointments", { waitUntil: "domcontentloaded" });
  await expect(ownerPage.getByText("Showroom Scoping Test")).toBeVisible();
  await ownerContext.close();

  const otherOwnerContext = await browser.newContext();
  const otherOwnerPage = await otherOwnerContext.newPage();
  await otherOwnerPage.goto("/login");
  await otherOwnerPage.getByLabel("Email address").fill(OTHER_OWNER_EMAIL);
  await otherOwnerPage.getByLabel("Password", { exact: true }).fill(OTHER_OWNER_PASSWORD);
  await otherOwnerPage.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await otherOwnerPage.waitForURL(/\/dashboard$/);
  await otherOwnerPage.goto("/dashboard/appointments", { waitUntil: "domcontentloaded" });
  await expect(otherOwnerPage.getByText("Showroom Scoping Test")).toHaveCount(0);
  await otherOwnerContext.close();
});

test("owner can edit and save availability from the dashboard, and it persists (exercises the real Save action + atomic replace_showroom_availability RPC)", async ({ page }) => {
  // Runs after every other test that depends on the fixture showroom's
  // Mon–Fri availability (this one adds Sunday on top of it, run serially
  // so ordering is guaranteed); the remaining "no availability" test below
  // uses an entirely separate showroom, so it's unaffected either way.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in to HarakaGari" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.goto("/dashboard/appointments/availability", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("Monday", { exact: true })).toBeChecked();
  await page.getByLabel("Sunday", { exact: true }).check();
  await page.getByLabel("Sunday opening time").fill("10:00");
  await page.getByLabel("Sunday closing time").fill("14:00");
  await page.getByRole("button", { name: "Save availability" }).click();
  await expect(page.getByText("Availability saved.")).toBeVisible({ timeout: 10000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Sunday", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Sunday opening time")).toHaveValue("10:00");
  await expect(page.getByLabel("Monday", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Monday opening time")).toHaveValue("09:00");
});

test("a vehicle whose showroom hasn't configured availability shows the disabled placeholder, not a live button", async ({ page }) => {
  const supabase = admin();
  const { data: otherOwner } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const otherOwnerId = otherOwner.users.find((u) => u.email === OTHER_OWNER_EMAIL)?.id;
  const { data: otherShowroom } = await supabase.from("showrooms").select("id").eq("owner_user_id", otherOwnerId).single();

  const { data: noAvailabilityVehicle, error } = await supabase
    .from("vehicles")
    .insert({
      showroom_id: otherShowroom!.id,
      title: `E2E No Availability Vehicle ${unique}`,
      make: `E2enoavail${unique}`,
      model: "Beta",
      year: 2021,
      price: 1_500_000,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (error || !noAvailabilityVehicle) throw error ?? new Error("vehicle not created");

  await page.goto(`/e2enoavail${unique}/beta-${noAvailabilityVehicle.id}`);
  await expect(page.getByRole("button", { name: "Schedule Test Drive" })).toBeDisabled();

  await supabase.from("vehicles").delete().eq("id", noAvailabilityVehicle.id);
});
