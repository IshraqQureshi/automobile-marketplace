"use server";

import { revalidatePath } from "next/cache";
import { currencyFormatter } from "@/features/vehicle/types";
import { getVehicleDetailPath } from "@/features/vehicle/slug";
import { renderInquiryNotificationEmail, renderInquiryThankYouEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inquiryFieldSchemas } from "./schemas";

export interface InquiryActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

/**
 * Submits a vehicle inquiry ("Send Message" CTA) — works for both a
 * signed-in customer (customer_id set, RLS's authenticated-insert policy)
 * and an anonymous visitor (customer_id null, RLS's anon-insert policy) —
 * see 20260906040000_add_vehicle_inquiry_contact_fields.sql. Authorization
 * for the insert itself is enforced entirely by those RLS policies; this
 * action's own job is just validation, plus the notification/thank-you
 * emails, which are best-effort and must never fail the inquiry itself
 * (it's already saved by the time emails are attempted).
 */
export async function submitVehicleInquiryAction(formData: FormData): Promise<InquiryActionResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  if (!vehicleId) return { error: "Missing vehicle." };

  const nameResult = inquiryFieldSchemas.name.safeParse(formData.get("name"));
  const emailResult = inquiryFieldSchemas.email.safeParse(formData.get("email"));
  const phoneResult = inquiryFieldSchemas.phone.safeParse(formData.get("phone"));
  const messageResult = inquiryFieldSchemas.message.safeParse(formData.get("message"));

  const fieldErrors: Record<string, string> = {};
  if (!nameResult.success) fieldErrors.name = nameResult.error.issues[0]?.message ?? "Enter a valid name.";
  if (!emailResult.success) fieldErrors.email = emailResult.error.issues[0]?.message ?? "Enter a valid email.";
  if (!phoneResult.success) fieldErrors.phone = phoneResult.error.issues[0]?.message ?? "Enter a valid phone number.";
  if (!messageResult.success) fieldErrors.message = messageResult.error.issues[0]?.message ?? "Enter a message.";
  if (!nameResult.success || !emailResult.success || !phoneResult.success || !messageResult.success) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, title, make, model, price, showroom_id, showrooms(business_name)")
    .eq("id", vehicleId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (vehicleError || !vehicle) {
    return { error: "This vehicle is no longer available." };
  }

  const contactPhone = `+254${phoneResult.data}`;
  // Deliberately no .select() here — vehicle_inquiries' SELECT RLS policy
  // is authenticated-only (see 20260903203104_create_rls_policies.sql),
  // and PostgREST's default Prefer: return=representation from .select()
  // performs the insert as INSERT ... RETURNING, which itself re-checks
  // the SELECT policy on the just-inserted row — for an anonymous
  // (customer_id null) submission that RETURNING silently fails RLS and
  // rolls back the whole insert (confirmed live: 42501 with .select(),
  // clean success without it). We don't need the row back anyway.
  const { error: insertError } = await supabase.from("vehicle_inquiries").insert({
    vehicle_id: vehicle.id,
    // Required by the generated Insert type, but always overwritten by the
    // set_vehicle_inquiry_showroom trigger — the real value is supplied
    // anyway since we already have it from the vehicle lookup above.
    showroom_id: vehicle.showroom_id,
    customer_id: user?.id ?? null,
    contact_name: nameResult.data,
    contact_email: emailResult.data,
    contact_phone: contactPhone,
    message: messageResult.data,
  });
  if (insertError) {
    logger.error("Failed to create vehicle inquiry", insertError, { vehicleId });
    return { error: "Something went wrong sending your message. Please try again." };
  }

  await sendInquiryEmails({
    vehicleTitle: `${vehicle.make} ${vehicle.model}`,
    vehicleUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}${getVehicleDetailPath(vehicle)}`,
    vehiclePrice: currencyFormatter.format(vehicle.price),
    showroomName: vehicle.showrooms?.business_name ?? "the showroom",
    showroomId: vehicle.showroom_id,
    contactName: nameResult.data,
    contactEmail: emailResult.data,
    contactPhone,
    message: messageResult.data,
  });

  return { success: true };
}

async function sendInquiryEmails(data: {
  vehicleTitle: string;
  vehicleUrl: string;
  vehiclePrice: string;
  showroomName: string;
  showroomId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  message: string;
}) {
  const admin = createAdminClient();

  const [{ data: showroom }, { data: adminProfiles }] = await Promise.all([
    admin.from("showrooms").select("owner_user_id").eq("id", data.showroomId).maybeSingle(),
    admin.from("profiles").select("id").eq("role", "ADMIN"),
  ]);

  const recipientIds = new Set<string>();
  if (showroom?.owner_user_id) recipientIds.add(showroom.owner_user_id);
  for (const profile of adminProfiles ?? []) recipientIds.add(profile.id);

  const recipientEmails: string[] = [];
  for (const id of recipientIds) {
    const { data: userResult } = await admin.auth.admin.getUserById(id);
    if (userResult?.user?.email) recipientEmails.push(userResult.user.email);
  }

  const notification = renderInquiryNotificationEmail(data);
  const thankYou = renderInquiryThankYouEmail(data);

  const results = await Promise.all([
    ...recipientEmails.map((to) => sendEmail({ to, subject: notification.subject, html: notification.html })),
    sendEmail({ to: data.contactEmail, subject: thankYou.subject, html: thankYou.html }),
  ]);

  if (results.some((sent) => !sent)) {
    logger.warn("One or more inquiry notification emails failed to send", { showroomId: data.showroomId, recipientCount: recipientEmails.length });
  }
}

/**
 * Marks one inquiry VIEWED (the read-state this table already models — see
 * 20260903201309_create_vehicle_inquiries.sql) — called when an admin or
 * the owning showroom actually opens it, not just lists it. Authorization
 * is enforced entirely by vehicle_inquiries_update_showroom_or_admin (RLS);
 * this action doesn't re-check role/ownership itself. Revalidates both
 * panels' layouts so their sidebar unread-count badges update immediately,
 * not just on the next full navigation.
 */
export async function markInquiryViewedAction(inquiryId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_inquiries").update({ status: "VIEWED" }).eq("id", inquiryId).eq("status", "NEW").select("id");

  if (error) {
    logger.error("Failed to mark inquiry viewed", error, { inquiryId });
    return { error: "Could not update this inquiry." };
  }

  // RLS silently filters a row this caller isn't allowed to touch (0 rows,
  // no error) rather than erroring — not itself a failure worth surfacing;
  // it just means there was nothing new to mark (already VIEWED, or not
  // this caller's to update).
  if (data && data.length > 0) {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
  }

  return {};
}
