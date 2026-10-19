import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { ADMIN_EMAIL, SENDER_NAME, escapeHtml, sendBrevoEmail } from "./brevo";

/**
 * Sends the two transactional emails for every form submission, via
 * Brevo's HTTP API: a "thanks, we'll be in touch" email to the
 * visitor, and a notification (with all submitted fields) to the
 * CodeCave team. Scheduled from each mutation in forms.ts right
 * after the submission is saved — never blocks the form's response.
 *
 * Requires BREVO_API_KEY to be set as a Convex environment variable
 * (see README: npx convex env set BREVO_API_KEY "..."). If it's not
 * set, this logs a warning and does nothing — forms still work and
 * still save to the database either way.
 */

function fieldsToHtml(fields: { label: string; value: string }[]): string {
  return fields
    .map(
      (f) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#64748B;font-weight:600;vertical-align:top;white-space:nowrap">${escapeHtml(f.label)}</td><td style="padding:4px 0">${escapeHtml(f.value)}</td></tr>`
    )
    .join("");
}

export const sendFormEmails = internalAction({
  args: {
    visitorEmail: v.string(),
    visitorName: v.string(),
    formLabel: v.string(), // human-readable, e.g. "Partnership Proposal"
    fields: v.array(v.object({ label: v.string(), value: v.string() })),
  },
  handler: async (ctx, { visitorEmail, visitorName, formLabel, fields }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error("BREVO_API_KEY is not set on this Convex deployment — skipping email send.");
      return;
    }
    const senderEmail = process.env.BREVO_SENDER_EMAIL || ADMIN_EMAIL;
    const firstName = (visitorName || "").trim().split(/\s+/)[0] || "there";

    const visitorHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101828">
        <h2 style="color:#0369A1;margin-bottom:12px">Thanks, ${escapeHtml(firstName)}!</h2>
        <p style="line-height:1.6">We've received your ${escapeHtml(formLabel.toLowerCase())} and someone from the CodeCave team will get back to you shortly.</p>
        <p style="line-height:1.6">In the meantime, feel free to explore more of what we do at
          <a href="https://codecave.com.ng" style="color:#0369A1">codecave.com.ng</a>.</p>
        <p style="margin-top:32px;color:#64748B;font-size:13px">— The CodeCave Team</p>
      </div>`;

    const adminHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#101828">
        <h2 style="color:#0369A1;margin-bottom:16px">New ${escapeHtml(formLabel)} submission</h2>
        <table style="border-collapse:collapse;width:100%">${fieldsToHtml(fields)}</table>
        <p style="margin-top:24px;color:#64748B;font-size:13px">Sent automatically from codecave.com.ng. Reply directly to this email to respond to the visitor.</p>
      </div>`;

    await Promise.all([
      sendBrevoEmail(apiKey, {
        sender: { name: SENDER_NAME, email: senderEmail },
        to: [{ email: visitorEmail, name: visitorName || undefined }],
        subject: "Thanks for reaching out to CodeCave!",
        htmlContent: visitorHtml,
      }),
      sendBrevoEmail(apiKey, {
        sender: { name: SENDER_NAME, email: senderEmail },
        to: [{ email: ADMIN_EMAIL }],
        replyTo: { email: visitorEmail, name: visitorName || undefined },
        subject: `New ${formLabel} from ${visitorName || visitorEmail}`,
        htmlContent: adminHtml,
      }),
    ]);
  },
});
