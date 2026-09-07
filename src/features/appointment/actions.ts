"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  renderAppointmentConfirmedEmail,
  renderAppointmentDeclinedEmail,
  renderAppointmentNotificationEmail,
} from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTimeSlots, type TimeSlot } from "./slots";
import { appointmentFieldSchemas, appointmentVehicleIdsSchema } from "./schemas";

const dateFormatter = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true });

function formatTime(time: string): string {
  return timeFormatter.format(new Date(`2000-01-01T${time}`));
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

function generateBookingReference(): string {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${timestampPart}-${randomPart}`;
}

export interface AvailableSlotsResult {
  slots: TimeSlot[];
  error?: string;
}

/**
 * Fetches the real, live set of bookable slots for one showroom+date —
 * called fresh whenever the customer picks a date, since it depends on
 * already-booked appointments at that exact moment, not just static
 * config. Public data (showroom_availability's own SELECT RLS policy is
 * public read), so this is safe to call for an anonymous visitor too.
 */
export async function getAvailableSlotsAction(showroomId: string, date: string): Promise<AvailableSlotsResult> {
  if (!showroomId || !date) return { slots: [], error: "Missing showroom or date." };

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const supabase = await createClient();
  // appointments_select_customer_or_showroom_or_admin is `to authenticated`
  // only — an anonymous visitor has zero SELECT visibility into the table
  // at all, so this specific lookup (which already-booked start times
  // exist) needs the service-role client to actually see them (confirmed
  // live: without this, every slot looked open to an anonymous visitor,
  // even an already-booked one). Only ever returns derived start_time
  // strings to the browser below, never contact_name/email/phone.
  const admin = createAdminClient();

  const [{ data: windows }, { data: showroom }, { data: booked }] = await Promise.all([
    supabase
      .from("showroom_availability")
      .select("start_time, end_time")
      .eq("showroom_id", showroomId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true),
    supabase.from("showrooms").select("slot_duration_minutes, buffer_minutes").eq("id", showroomId).maybeSingle(),
    admin.from("appointments").select("start_time").eq("showroom_id", showroomId).eq("appointment_date", date).in("status", ["PENDING", "CONFIRMED"]),
  ]);

  if (!showroom) return { slots: [], error: "Showroom not found." };
  if (!windows || windows.length === 0) return { slots: [] };

  const today = new Date();
  const isToday = date === today.toISOString().slice(0, 10);
  const nowMinutes = isToday ? today.getHours() * 60 + today.getMinutes() : undefined;
  const bookedStartTimes = (booked ?? []).map((row) => row.start_time);

  const slots = windows.flatMap((window) =>
    generateTimeSlots({
      windowStartTime: window.start_time,
      windowEndTime: window.end_time,
      slotDurationMinutes: showroom.slot_duration_minutes,
      bufferMinutes: showroom.buffer_minutes,
      bookedStartTimes,
      nowMinutes,
    }),
  );
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return { slots };
}

export interface AppointmentActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  bookingReference?: string;
}

/**
 * Submits a "Schedule Test Drive" appointment request — works for both a
 * signed-in customer (customer_id set) and an anonymous visitor
 * (customer_id null), same RLS-driven split as vehicle inquiries/financing
 * applications. Supports multiple vehicles in one appointment (APT-003) —
 * all must belong to the same showroom, validated here (not just left to
 * the DB trigger) so a mismatched selection gets a clear message instead
 * of a raw Postgres error.
 */
export async function submitAppointmentAction(formData: FormData): Promise<AppointmentActionResult> {
  const nameResult = appointmentFieldSchemas.name.safeParse(formData.get("name"));
  const emailResult = appointmentFieldSchemas.email.safeParse(formData.get("email"));
  const phoneResult = appointmentFieldSchemas.phone.safeParse(formData.get("phone"));
  const dateResult = appointmentFieldSchemas.appointmentDate.safeParse(formData.get("appointmentDate"));
  const startTimeResult = appointmentFieldSchemas.startTime.safeParse(formData.get("startTime"));
  const notesResult = appointmentFieldSchemas.notes.safeParse(formData.get("notes"));
  const vehicleIdsResult = appointmentVehicleIdsSchema.safeParse(formData.getAll("vehicleIds"));

  const fieldErrors: Record<string, string> = {};
  if (!nameResult.success) fieldErrors.name = nameResult.error.issues[0]?.message ?? "Enter a valid name.";
  if (!emailResult.success) fieldErrors.email = emailResult.error.issues[0]?.message ?? "Enter a valid email.";
  if (!phoneResult.success) fieldErrors.phone = phoneResult.error.issues[0]?.message ?? "Enter a valid phone number.";
  if (!dateResult.success) fieldErrors.appointmentDate = dateResult.error.issues[0]?.message ?? "Choose a date.";
  if (!startTimeResult.success) fieldErrors.startTime = startTimeResult.error.issues[0]?.message ?? "Choose a time slot.";
  if (!notesResult.success) fieldErrors.notes = notesResult.error.issues[0]?.message ?? "Notes are too long.";
  if (!vehicleIdsResult.success) fieldErrors.vehicleIds = vehicleIdsResult.error.issues[0]?.message ?? "Select at least one vehicle.";
  if (
    !nameResult.success ||
    !emailResult.success ||
    !phoneResult.success ||
    !dateResult.success ||
    !startTimeResult.success ||
    !notesResult.success ||
    !vehicleIdsResult.success
  ) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, make, model, showroom_id, showrooms(business_name)")
    .in("id", vehicleIdsResult.data)
    .eq("status", "ACTIVE");
  if (vehiclesError || !vehicles || vehicles.length !== vehicleIdsResult.data.length) {
    return { error: "One or more selected vehicles are no longer available." };
  }
  const showroomId = vehicles[0]!.showroom_id;
  if (vehicles.some((v) => v.showroom_id !== showroomId)) {
    return { error: "All vehicles in one appointment must belong to the same showroom." };
  }

  const { data: showroom } = await supabase.from("showrooms").select("slot_duration_minutes").eq("id", showroomId).maybeSingle();
  const slotDurationMinutes = showroom?.slot_duration_minutes ?? 30;
  const [hours, minutes] = startTimeResult.data.split(":").map(Number);
  const endTotalMinutes = (hours ?? 0) * 60 + (minutes ?? 0) + slotDurationMinutes;
  const endTime = `${Math.floor(endTotalMinutes / 60)
    .toString()
    .padStart(2, "0")}:${(endTotalMinutes % 60).toString().padStart(2, "0")}`;

  const appointmentId = crypto.randomUUID();
  const bookingReference = generateBookingReference();

  // Deliberately no .select() here — same RLS-with-RETURNING gotcha as
  // vehicle_inquiries/financing_applications (an anonymous insert's
  // RETURNING re-checks the SELECT policy and silently rolls back). The id
  // is generated here instead, since appointment_vehicles rows need it
  // regardless.
  const { error: insertError } = await supabase.from("appointments").insert({
    id: appointmentId,
    booking_reference: bookingReference,
    customer_id: user?.id ?? null,
    showroom_id: showroomId,
    appointment_date: dateResult.data,
    start_time: startTimeResult.data,
    end_time: endTime,
    contact_name: nameResult.data,
    contact_email: emailResult.data,
    contact_phone: `+254${phoneResult.data}`,
    customer_notes: notesResult.data ?? null,
  });
  if (insertError) {
    // The DB's own partial unique index (appointments_no_double_booking) is
    // the real, race-safe guard against two customers booking the same
    // slot at once — this is the one place that guard can actually fire,
    // if someone else booked this exact slot between the customer loading
    // the slot picker and submitting.
    if (insertError.code === "23505") {
      return { error: "That time slot was just booked by someone else. Please choose another." };
    }
    logger.error("Failed to create appointment", insertError, { showroomId });
    return { error: "Something went wrong submitting your appointment. Please try again." };
  }

  const { error: vehiclesInsertError } = await supabase
    .from("appointment_vehicles")
    .insert(vehicleIdsResult.data.map((vehicleId) => ({ appointment_id: appointmentId, vehicle_id: vehicleId })));
  if (vehiclesInsertError) {
    logger.error("Failed to attach vehicles to appointment, rolling back", vehiclesInsertError, { appointmentId });
    const admin = createAdminClient();
    await admin.from("appointments").delete().eq("id", appointmentId);
    return { error: "Something went wrong submitting your appointment. Please try again." };
  }

  const showroomName = vehicles[0]!.showrooms?.business_name ?? "the showroom";
  const vehicleTitles = vehicles.map((v) => `${v.make} ${v.model}`);

  // Not awaited — see PR #51/#52's own findings on why a notification email
  // must never block the response, and why next/server's after() (not a
  // bare unawaited call) is the safe way to do that on Vercel's serverless
  // runtime.
  after(async () => {
    await sendAppointmentNotificationEmails({
      showroomId,
      emailData: {
        bookingReference,
        showroomName,
        appointmentDate: dateFormatter.format(new Date(`${dateResult.data}T00:00:00`)),
        timeRange: formatTimeRange(startTimeResult.data, endTime),
        vehicleTitles,
        contactName: nameResult.data,
        contactEmail: emailResult.data,
        contactPhone: `+254${phoneResult.data}`,
      },
    });
  });

  return { success: true, bookingReference };
}

async function sendAppointmentNotificationEmails(input: {
  showroomId: string;
  emailData: Parameters<typeof renderAppointmentNotificationEmail>[0];
}) {
  const admin = createAdminClient();

  const [{ data: showroom }, { data: adminProfiles }] = await Promise.all([
    admin.from("showrooms").select("owner_user_id").eq("id", input.showroomId).maybeSingle(),
    admin.from("profiles").select("id").eq("role", "ADMIN"),
  ]);

  const recipientIds = new Set<string>();
  if (showroom?.owner_user_id) recipientIds.add(showroom.owner_user_id);
  for (const profile of adminProfiles ?? []) recipientIds.add(profile.id);

  const userResults = await Promise.all([...recipientIds].map((id) => admin.auth.admin.getUserById(id)));
  const recipientEmails = userResults.map((result) => result.data?.user?.email).filter((email): email is string => Boolean(email));

  const notification = renderAppointmentNotificationEmail(input.emailData);
  const results = await Promise.all(recipientEmails.map((to) => sendEmail({ to, subject: notification.subject, html: notification.html })));

  if (results.some((sent) => !sent)) {
    logger.warn("One or more appointment notification emails failed to send", { showroomId: input.showroomId, recipientCount: recipientEmails.length });
  }
}

interface AppointmentStatusUpdateResult {
  error?: string;
}

/**
 * PENDING → CONFIRMED only — authorization is enforced entirely by
 * appointments_update_customer_or_showroom_or_admin (RLS); this action
 * additionally scopes the update to status='PENDING' itself so it can
 * never "confirm" an already-DECLINED/CANCELLED/COMPLETED row (the
 * lifecycle transition APT-010 describes, enforced here in the action
 * layer since RLS is deliberately broad by design — see the migration's
 * own comment). Sends the confirmation email to the customer only once
 * the update genuinely took effect.
 */
export async function confirmAppointmentAction(appointmentId: string): Promise<AppointmentStatusUpdateResult> {
  return transitionAppointmentStatus(appointmentId, "CONFIRMED", renderAppointmentConfirmedEmail);
}

/** PENDING → DECLINED only — same convention as confirmAppointmentAction. */
export async function declineAppointmentAction(appointmentId: string): Promise<AppointmentStatusUpdateResult> {
  return transitionAppointmentStatus(appointmentId, "DECLINED", renderAppointmentDeclinedEmail);
}

async function transitionAppointmentStatus(
  appointmentId: string,
  nextStatus: "CONFIRMED" | "DECLINED",
  renderEmail: typeof renderAppointmentConfirmedEmail,
): Promise<AppointmentStatusUpdateResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: nextStatus })
    .eq("id", appointmentId)
    .eq("status", "PENDING")
    .select(
      "id, booking_reference, appointment_date, start_time, end_time, contact_name, contact_email, contact_phone, showrooms(business_name), appointment_vehicles(vehicles(make, model))",
    );

  if (error) {
    logger.error(`Failed to transition appointment to ${nextStatus}`, error, { appointmentId });
    return { error: "Could not update this appointment." };
  }
  // RLS silently filters a row this caller isn't allowed to touch (0
  // rows, no error) rather than erroring — same convention as every other
  // RLS-scoped update in this codebase. Also correctly covers "this
  // appointment isn't PENDING anymore" (already confirmed/declined by
  // someone else, or by a concurrent request), since the .eq("status",
  // "PENDING") is part of the same query.
  if (!data || data.length === 0) {
    return { error: "Not found, or this appointment isn't pending anymore." };
  }

  const row = data[0]!;
  const vehicleTitles = (row.appointment_vehicles ?? [])
    .map((av) => av.vehicles)
    .filter((v): v is { make: string; model: string } => v != null)
    .map((v) => `${v.make} ${v.model}`);

  after(async () => {
    const email = renderEmail({
      bookingReference: row.booking_reference,
      showroomName: row.showrooms?.business_name ?? "the showroom",
      appointmentDate: dateFormatter.format(new Date(`${row.appointment_date}T00:00:00`)),
      timeRange: formatTimeRange(row.start_time, row.end_time),
      vehicleTitles,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
    });
    const sent = await sendEmail({ to: row.contact_email, subject: email.subject, html: email.html });
    if (!sent) {
      logger.warn(`Failed to send appointment ${nextStatus.toLowerCase()} email`, { appointmentId });
    }
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");

  return {};
}
