#!/usr/bin/env node
// Generates the branded auth email HTML files under supabase/templates/
// from one shared shell, so every Supabase Auth email (signup
// confirmation, password reset, etc.) matches the app's actual branding
// instead of Supabase's generic default templates.
//
// These are static files GoTrue reads at container startup (referenced
// from supabase/config.toml's [auth.email.template.*] /
// [auth.email.notification.*] blocks) — there's no live build step, so
// re-run this script and `supabase stop && supabase start` after editing
// EMAILS below.
//
// Template variables come from GoTrue's Go html/template engine, not
// this script — {{ .ConfirmationURL }}, {{ .SiteURL }}, {{ .Email }},
// {{ .NewEmail }}, {{ .Data.full_name }} (signup metadata) are resolved
// at send time, not here.

import { mkdirSync, writeFileSync } from "node:fs";

const BRAND = "#0e6b73";
const BRAND_DARK = "#0a4f55";
const INK = "#0e1917";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

function shell({ preheader, heading, bodyHtml, ctaLabel, ctaUrl, footnote }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HarakaGari</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f5f5f4; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none; font-size:1px; color:#f5f5f4; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      ${preheader}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid ${BORDER};">
            <tr>
              <td style="padding:28px 32px 20px 32px; border-bottom:1px solid ${BORDER};">
                <img src="{{ .SiteURL }}/logo.png" alt="HarakaGari" height="28" style="height:28px; display:block;" />
                <div style="margin-top:6px; font-size:11px; letter-spacing:0.06em; color:${MUTED}; text-transform:uppercase;">
                  Powered by Arresa
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px 0; font-family:Georgia,'Times New Roman',serif; font-size:22px; font-weight:600; color:${INK};">
                  ${heading}
                </h1>
                <div style="font-size:14px; line-height:1.6; color:#374151;">
                  ${bodyHtml}
                </div>
                ${
                  ctaLabel
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;">
                  <tr>
                    <td style="border-radius:8px; background-color:${BRAND};">
                      <a href="${ctaUrl}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>`
                    : ""
                }
                <p style="margin:24px 0 0 0; font-size:12px; line-height:1.6; color:${MUTED};">
                  ${footnote}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#fafaf9; border-top:1px solid ${BORDER};">
                <p style="margin:0; font-size:12px; color:${MUTED};">
                  <a href="{{ .SiteURL }}/terms" style="color:${BRAND_DARK}; text-decoration:underline;">Terms of Service</a>
                  &nbsp;·&nbsp;
                  <a href="{{ .SiteURL }}/privacy" style="color:${BRAND_DARK}; text-decoration:underline;">Privacy Policy</a>
                </p>
                <p style="margin:8px 0 0 0; font-size:12px; color:${MUTED};">
                  © HarakaGari by Arresa. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

const GREETING = `{{ if .Data.full_name }}Hi {{ .Data.full_name }},{{ else }}Hi there,{{ end }}`;

const EMAILS = {
  confirmation: {
    subject: "Confirm your email — HarakaGari",
    preheader: "Confirm your email to activate your HarakaGari account.",
    heading: "Confirm your email address",
    bodyHtml: `<p style="margin:0 0 12px 0;">${GREETING}</p><p style="margin:0;">Thanks for signing up with HarakaGari, Kenya's premium car marketplace. Click below to confirm your email and activate your account.</p>`,
    ctaLabel: "Confirm email",
    ctaUrl: "{{ .ConfirmationURL }}",
    footnote: "If you didn't create a HarakaGari account, you can safely ignore this email.",
  },
  recovery: {
    subject: "Reset your password — HarakaGari",
    preheader: "Reset the password for your HarakaGari account.",
    heading: "Reset your password",
    bodyHtml: `<p style="margin:0 0 12px 0;">${GREETING}</p><p style="margin:0;">We received a request to reset the password for your HarakaGari account. Click below to choose a new one.</p>`,
    ctaLabel: "Reset password",
    ctaUrl: "{{ .ConfirmationURL }}",
    footnote: "If you didn't request this, you can safely ignore this email — your password won't change.",
  },
  email_change: {
    subject: "Confirm your new email — HarakaGari",
    preheader: "Confirm your new email address for HarakaGari.",
    heading: "Confirm your new email address",
    bodyHtml: `<p style="margin:0 0 12px 0;">${GREETING}</p><p style="margin:0;">Click below to confirm <strong>{{ .NewEmail }}</strong> as the new email address for your HarakaGari account.</p>`,
    ctaLabel: "Confirm new email",
    ctaUrl: "{{ .ConfirmationURL }}",
    footnote: "If you didn't request this change, please contact us immediately — your email won't change until this link is used.",
  },
  invite: {
    subject: "You've been invited to HarakaGari",
    preheader: "You've been invited to join HarakaGari.",
    heading: "You're invited to join HarakaGari",
    bodyHtml: `<p style="margin:0;">You've been invited to create an account on HarakaGari, Kenya's premium car marketplace. Click below to accept your invitation and set up your account.</p>`,
    ctaLabel: "Accept invitation",
    ctaUrl: "{{ .ConfirmationURL }}",
    footnote: "If you weren't expecting this invitation, you can safely ignore this email.",
  },
  password_changed_notification: {
    subject: "Your password was changed — HarakaGari",
    preheader: "The password for your HarakaGari account was changed.",
    heading: "Your password was changed",
    bodyHtml: `<p style="margin:0;">This confirms the password for your HarakaGari account (${"{{ .Email }}"}) was recently changed.</p>`,
    ctaLabel: "Secure my account",
    ctaUrl: "{{ .SiteURL }}/forgot-password",
    footnote: "If this wasn't you, use the button above to reset your password immediately.",
  },
  email_changed_notification: {
    subject: "Your email address was changed — HarakaGari",
    preheader: "The email address for your HarakaGari account was changed.",
    heading: "Your email address was changed",
    bodyHtml: `<p style="margin:0;">This confirms the email address on your HarakaGari account was recently changed.</p>`,
    footnote: "If this wasn't you, please contact us immediately.",
  },
};

const outDir = new URL("../supabase/templates/", import.meta.url);
mkdirSync(outDir, { recursive: true });

for (const [name, email] of Object.entries(EMAILS)) {
  const html = shell(email);
  writeFileSync(new URL(`${name}.html`, outDir), html);
  console.log(`wrote supabase/templates/${name}.html`);
}
