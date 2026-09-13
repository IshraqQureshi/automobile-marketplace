import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue(undefined);
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

const ORIGINAL_ENV = { ...process.env };

describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMail.mockClear();
    createTransport.mockClear();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM_EMAIL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("skips sending and returns false when SMTP credentials are missing, without throwing", async () => {
    const { sendEmail } = await import("./email");
    const result = await sendEmail({ to: "customer@example.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(result).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("falls back to the placeholder From address when SMTP_FROM_EMAIL is unset", async () => {
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    const { sendEmail } = await import("./email");
    await sendEmail({ to: "customer@example.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: '"HarakaGari" <noreply@harakagari.local>' }));
  });

  it("uses SMTP_FROM_EMAIL verbatim when set", async () => {
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.SMTP_FROM_EMAIL = "noreply@harakagari.com";
    const { sendEmail } = await import("./email");
    await sendEmail({ to: "customer@example.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: '"HarakaGari" <noreply@harakagari.com>' }));
  });

  it("returns true when the transport send succeeds", async () => {
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    const { sendEmail } = await import("./email");
    const result = await sendEmail({ to: "customer@example.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(result).toBe(true);
  });

  it("returns false, without throwing, when the transport send rejects", async () => {
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    sendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));
    const { sendEmail } = await import("./email");
    const result = await sendEmail({ to: "customer@example.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(result).toBe(false);
  });
});
