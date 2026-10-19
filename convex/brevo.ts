/**
 * Shared Brevo (transactional email) helpers. Used by the form emails
 * (convex/email.ts) and the Academy sign-up codes (convex/authEmails.ts).
 */

export const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
export const ADMIN_EMAIL = "support.codecave@gmail.com";
export const SENDER_NAME = "CodeCave Inc.";

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBrevoEmail(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo API error ${res.status}: ${text}`);
  }
}
