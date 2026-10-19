import { ConvexError } from "convex/values";

/**
 * Input cleaning for anything a visitor can send us. Throws a
 * ConvexError with a plain-English message — unlike a plain Error,
 * its message reaches the browser in production, so the form can
 * show it (assets/js/forms.js displays `err.data`).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Control characters except tab (\x09), newline (\x0A) and carriage return (\x0D).
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function fail(message: string): never {
  throw new ConvexError(message);
}

function tidy(raw: string): string {
  return raw.replace(CONTROL_RE, "").trim();
}

export function cleanEmail(raw: string): string {
  const email = tidy(raw).toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) fail("Please enter a valid email address.");
  return email;
}

export function cleanText(raw: string, label: string, max: number): string {
  const text = tidy(raw);
  if (text.length === 0) fail(`${label} is required.`);
  if (text.length > max) fail(`${label} is too long (maximum ${max} characters).`);
  return text;
}

export function cleanOptionalText(raw: string | undefined, label: string, max: number): string | undefined {
  if (raw === undefined) return undefined;
  const text = tidy(raw);
  if (text.length === 0) return undefined;
  if (text.length > max) fail(`${label} is too long (maximum ${max} characters).`);
  return text;
}

export function cleanOptionalInt(raw: number | undefined, label: string, min: number, max: number): number | undefined {
  if (raw === undefined) return undefined;
  if (!Number.isInteger(raw) || raw < min || raw > max) fail(`${label} must be a whole number between ${min} and ${max}.`);
  return raw;
}
