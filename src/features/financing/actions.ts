"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { currencyFormatter } from "@/features/vehicle/types";
import { getVehicleDetailPath } from "@/features/vehicle/slug";
import { renderFinancingApplicationNotificationEmail, renderFinancingApplicationReceivedEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYMENT_STATUS_OPTIONS, financingApplicationFieldSchemas } from "./schemas";

export interface FinancingApplicationActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function employmentStatusLabel(value: string): string {
  return EMPLOYMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * Submits an "Apply for Financing" application — works for both a signed-in
 * customer (customer_id set) and an anonymous visitor (customer_id null),
 * same RLS-driven split as submitVehicleInquiryAction. This action's own
 * job is validation plus the notification/confirmation emails, which are
 * best-effort and must never fail the application itself (it's already
 * saved by the time emails are attempted).
 */
export async function submitFinancingApplicationAction(formData: FormData): Promise<FinancingApplicationActionResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  if (!vehicleId) return { error: "Missing vehicle." };

  const nameResult = financingApplicationFieldSchemas.name.safeParse(formData.get("name"));
  const emailResult = financingApplicationFieldSchemas.email.safeParse(formData.get("email"));
  const phoneResult = financingApplicationFieldSchemas.phone.safeParse(formData.get("phone"));
  const employmentStatusResult = financingApplicationFieldSchemas.employmentStatus.safeParse(formData.get("employmentStatus"));
  const monthlyIncomeResult = financingApplicationFieldSchemas.monthlyIncome.safeParse(formData.get("monthlyIncome"));
  const nationalIdResult = financingApplicationFieldSchemas.nationalId.safeParse(formData.get("nationalId"));
  const desiredDownPaymentResult = financingApplicationFieldSchemas.desiredDownPayment.safeParse(formData.get("desiredDownPayment"));
  const desiredTenureMonthsResult = financingApplicationFieldSchemas.desiredTenureMonths.safeParse(formData.get("desiredTenureMonths"));
  const notesResult = financingApplicationFieldSchemas.notes.safeParse(formData.get("notes"));

  const fieldErrors: Record<string, string> = {};
  if (!nameResult.success) fieldErrors.name = nameResult.error.issues[0]?.message ?? "Enter a valid name.";
  if (!emailResult.success) fieldErrors.email = emailResult.error.issues[0]?.message ?? "Enter a valid email.";
  if (!phoneResult.success) fieldErrors.phone = phoneResult.error.issues[0]?.message ?? "Enter a valid phone number.";
  if (!employmentStatusResult.success) fieldErrors.employmentStatus = employmentStatusResult.error.issues[0]?.message ?? "Choose your employment status.";
  if (!monthlyIncomeResult.success) fieldErrors.monthlyIncome = monthlyIncomeResult.error.issues[0]?.message ?? "Enter your monthly income.";
  if (!nationalIdResult.success) fieldErrors.nationalId = nationalIdResult.error.issues[0]?.message ?? "Enter a valid ID/passport number.";
  if (!desiredDownPaymentResult.success) fieldErrors.desiredDownPayment = desiredDownPaymentResult.error.issues[0]?.message ?? "Enter a valid down payment.";
  if (!desiredTenureMonthsResult.success) fieldErrors.desiredTenureMonths = desiredTenureMonthsResult.error.issues[0]?.message ?? "Choose a loan term.";
  if (!notesResult.success) fieldErrors.notes = notesResult.error.issues[0]?.message ?? "Notes are too long.";
  if (
    !nameResult.success ||
    !emailResult.success ||
    !phoneResult.success ||
    !employmentStatusResult.success ||
    !monthlyIncomeResult.success ||
    !nationalIdResult.success ||
    !desiredDownPaymentResult.success ||
    !desiredTenureMonthsResult.success ||
    !notesResult.success
  ) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, make, model, showroom_id, showrooms(business_name)")
    .eq("id", vehicleId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (vehicleError || !vehicle) {
    return { error: "This vehicle is no longer available." };
  }

  const contactPhone = `+254${phoneResult.data}`;
  // Deliberately no .select() here — same RLS-with-RETURNING gotcha as
  // submitVehicleInquiryAction: an anonymous (customer_id null) insert's
  // RETURNING re-checks the SELECT policy on the just-inserted row and
  // silently rolls back. We don't need the row back anyway.
  const { error: insertError } = await supabase.from("financing_applications").insert({
    vehicle_id: vehicle.id,
    // Required by the generated Insert type, but always overwritten by the
    // set_financing_application_showroom trigger.
    showroom_id: vehicle.showroom_id,
    customer_id: user?.id ?? null,
    contact_name: nameResult.data,
    contact_email: emailResult.data,
    contact_phone: contactPhone,
    employment_status: employmentStatusResult.data,
    monthly_income: monthlyIncomeResult.data,
    national_id: nationalIdResult.data,
    desired_down_payment: desiredDownPaymentResult.data,
    desired_tenure_months: desiredTenureMonthsResult.data,
    notes: notesResult.data ?? null,
  });
  if (insertError) {
    logger.error("Failed to create financing application", insertError, { vehicleId });
    return { error: "Something went wrong submitting your application. Please try again." };
  }

  // Not awaited — a notification email must never block or delay the real
  // outcome it's reporting on (the application is already saved above).
  // Uses next/server's after() rather than a bare unawaited call, since a
  // plain fire-and-forget promise isn't safe on Vercel's serverless
  // runtime, which can freeze/terminate a function immediately once its
  // response is sent (confirmed the hard way in PR #51's own review).
  after(async () => {
    await sendFinancingApplicationEmails({
      vehicleTitle: `${vehicle.make} ${vehicle.model}`,
      vehicleUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}${getVehicleDetailPath({ id: vehicle.id, make: vehicle.make, model: vehicle.model })}`,
      showroomName: vehicle.showrooms?.business_name ?? "the showroom",
      showroomId: vehicle.showroom_id,
      contactName: nameResult.data,
      contactEmail: emailResult.data,
      contactPhone,
      employmentStatusLabel: employmentStatusLabel(employmentStatusResult.data),
      monthlyIncome: currencyFormatter.format(monthlyIncomeResult.data),
      desiredDownPayment: currencyFormatter.format(desiredDownPaymentResult.data),
      desiredTenureMonths: desiredTenureMonthsResult.data,
    });
  });

  return { success: true };
}

async function sendFinancingApplicationEmails(data: {
  vehicleTitle: string;
  vehicleUrl: string;
  showroomName: string;
  showroomId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  employmentStatusLabel: string;
  monthlyIncome: string;
  desiredDownPayment: string;
  desiredTenureMonths: number;
}) {
  const admin = createAdminClient();

  const [{ data: showroom }, { data: adminProfiles }] = await Promise.all([
    admin.from("showrooms").select("owner_user_id").eq("id", data.showroomId).maybeSingle(),
    admin.from("profiles").select("id").eq("role", "ADMIN"),
  ]);

  const recipientIds = new Set<string>();
  if (showroom?.owner_user_id) recipientIds.add(showroom.owner_user_id);
  for (const profile of adminProfiles ?? []) recipientIds.add(profile.id);

  // Resolved in parallel, not a sequential loop — see PR #50/#51's own
  // "52 accumulated ADMIN-role profiles" finding for why this matters.
  const userResults = await Promise.all([...recipientIds].map((id) => admin.auth.admin.getUserById(id)));
  const recipientEmails = userResults.map((result) => result.data?.user?.email).filter((email): email is string => Boolean(email));

  const notification = renderFinancingApplicationNotificationEmail(data);
  const received = renderFinancingApplicationReceivedEmail(data);

  const results = await Promise.all([
    ...recipientEmails.map((to) => sendEmail({ to, subject: notification.subject, html: notification.html })),
    sendEmail({ to: data.contactEmail, subject: received.subject, html: received.html }),
  ]);

  if (results.some((sent) => !sent)) {
    logger.warn("One or more financing application notification emails failed to send", { showroomId: data.showroomId, recipientCount: recipientEmails.length });
  }
}

/**
 * Marks one financing application VIEWED — called when an admin or the
 * owning showroom actually opens it, not just lists it. Authorization is
 * enforced entirely by financing_applications_update_showroom_or_admin
 * (RLS); this action doesn't re-check role/ownership itself. Revalidates
 * both panels' layouts so their sidebar unread-count badges update
 * immediately, not just on the next full navigation.
 */
export async function markFinancingApplicationViewedAction(applicationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financing_applications")
    .update({ status: "VIEWED" })
    .eq("id", applicationId)
    .eq("status", "NEW")
    .select("id");

  if (error) {
    logger.error("Failed to mark financing application viewed", error, { applicationId });
    return { error: "Could not update this application." };
  }

  // RLS silently filters a row this caller isn't allowed to touch (0 rows,
  // no error) rather than erroring — not itself a failure worth surfacing.
  if (data && data.length > 0) {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
  }

  return {};
}
