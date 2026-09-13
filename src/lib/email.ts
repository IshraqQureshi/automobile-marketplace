// The first app-triggered (non-Supabase-Auth) email sender in this project.
// Supabase Auth's own emails (signup confirmation, password reset) are sent
// entirely by GoTrue itself using supabase/config.toml's [auth.email.smtp]
// block — this module is for emails the *application* decides to send
// (e.g. a vehicle inquiry notification), which needs its own transport.
//
// SMTP_USER/SMTP_PASS hold local Mailtrap sandbox credentials in dev (see
// .env.local) and the real production SMTP provider's credentials in
// production (set directly in Vercel, never committed) — same var names
// either way, just a different value per environment. Host/port default to
// the Mailtrap sandbox but are overridable via env for production.
import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

const SMTP_HOST = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);
// Must match (or be a verified alias of) the authenticated SMTP_USER account
// for most real providers (Gmail in particular silently rewrites or bounces
// a From address that doesn't match the authenticated sender) — a fixed
// placeholder like "noreply@harakagari.local" only worked against Mailtrap's
// sandbox, which never actually delivers/validates it. Falls back to that
// same placeholder so local dev against Mailtrap is unaffected.
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@harakagari.local";
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
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
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
