import { Email } from "@convex-dev/auth/providers/Email";
import { ConvexError } from "convex/values";
import { ADMIN_EMAIL, SENDER_NAME, escapeHtml, sendBrevoEmail } from "./brevo";
import { rateLimiter } from "./rateLimits";

/**
 * One-time-code emails for CodeCave Academy students: verifying a new
 * account and resetting a password. Codes are 8 digits, valid for 15
 * minutes, and sent through Brevo. Staff accounts never use these.
 */

const CODE_LENGTH = 8;
const CODE_MAX_AGE_SECONDS = 15 * 60;

function randomCode(): string {
  const values = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(values);
  return Array.from(values, (n) => String(n % 10)).join("");
}

function codeEmailHtml(heading: string, intro: string, code: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101828">
      <h2 style="color:#0369A1;margin-bottom:12px">${escapeHtml(heading)}</h2>
      <p style="line-height:1.6">${escapeHtml(intro)}</p>
      <p style="font-size:32px;letter-spacing:6px;font-weight:700;margin:20px 0;color:#0B3D91">${escapeHtml(code)}</p>
      <p style="line-height:1.6;color:#475467">This code expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>
      <p style="margin-top:32px;color:#64748B;font-size:13px">— CodeCave Academy</p>
    </div>`;
}

function otpProvider(opts: { id: string; subject: string; heading: string; intro: string }) {
  return Email({
    id: opts.id,
    maxAge: CODE_MAX_AGE_SECONDS,
    async generateVerificationToken() {
      return randomCode();
    },
    // The second argument is the action context Convex Auth passes through
    // (typed loosely by the library); we use it to rate-limit.
    async sendVerificationRequest({ identifier, token }, ctx?: any) {
      const email = identifier.trim().toLowerCase();

      if (ctx) {
        const perAddress = await rateLimiter.limit(ctx, "authEmailPerAddress", { key: email });
        if (!perAddress.ok) {
          throw new ConvexError("Too many emails requested for this address. Please wait a little while and try again.");
        }
        const global = await rateLimiter.limit(ctx, "authEmailGlobal");
        if (!global.ok) {
          throw new ConvexError("We're sending a lot of emails right now. Please try again in a few minutes.");
        }
      }

      const apiKey = process.env.BREVO_API_KEY;
      if (!apiKey) {
        console.error("BREVO_API_KEY is not set on this Convex deployment — cannot send sign-in codes.");
        throw new ConvexError("Email delivery isn't available right now. Please contact support.");
      }
      await sendBrevoEmail(apiKey, {
        sender: { name: SENDER_NAME, email: process.env.BREVO_SENDER_EMAIL || ADMIN_EMAIL },
        to: [{ email }],
        subject: `${opts.subject}: ${token}`,
        htmlContent: codeEmailHtml(opts.heading, opts.intro, token),
      });
    },
  });
}

export const StudentVerifyEmail = otpProvider({
  id: "student-verify",
  subject: "Your CodeCave Academy verification code",
  heading: "Verify your email",
  intro: "Enter this code in CodeCave Academy to finish creating your account:",
});

export const StudentResetEmail = otpProvider({
  id: "student-reset",
  subject: "Your CodeCave Academy password reset code",
  heading: "Reset your password",
  intro: "Enter this code in CodeCave Academy to choose a new password:",
});
