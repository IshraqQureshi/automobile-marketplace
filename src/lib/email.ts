// The first app-triggered (non-Supabase-Auth) email sender in this project.
// Supabase Auth's own emails (signup confirmation, password reset) are sent
// entirely by GoTrue itself using supabase/config.toml's [auth.email.smtp]
// block — this module is for emails the *application* decides to send
// (e.g. a vehicle inquiry notification), which needs its own transport.
//
// Reuses the exact same Mailtrap sandbox credentials already configured for
// local/staging dev (MAILTRAP_SMTP_USER/PASS in .env.local) rather than
// introducing a second, differently-named set of env vars for the same
// inbox. Host/port aren't secrets — hardcoded here the same way
// config.toml hardcodes its own host/port, overridable via env for a real
// production SMTP provider later (see B-007).
import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

const SMTP_HOST = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);
const FROM_EMAIL = "noreply@harakagari.local";
const FROM_NAME = "HarakaGari";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Never throws — a notification email failing must not roll back or block
 * whatever real database write it's reporting on (matches the
 * `notifications` table's own migration comment on this exact principle).
 * Returns whether it actually sent, so a caller can log a warning without
 * treating it as a hard failure.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const user = process.env.MAILTRAP_SMTP_USER;
  const pass = process.env.MAILTRAP_SMTP_PASS;
  if (!user || !pass) {
    logger.warn("Skipping email send — SMTP credentials not configured", { to, subject });
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, auth: { user, pass } });
    await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html });
    return true;
  } catch (error) {
    logger.error("Failed to send email", error, { to, subject });
    return false;
  }
}
