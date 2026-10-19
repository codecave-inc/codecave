import { ConvexError } from "convex/values";
import type { Value } from "convex/values";
import { cleanEmail, cleanText, fail } from "./validation";

/**
 * Validation for CodeCave Academy student sign-up. Runs inside the
 * Password provider's `profile` hook (convex/auth.ts), on the server,
 * so it can't be skipped by calling the API directly. It must be
 * synchronous (Convex Auth doesn't await it).
 */

export type StudentSignup = {
  country: string;
  ageBand: "16-17" | "18+";
  guardianConsent: boolean;
  termsAcceptedAt: number;
  conductAcceptedAt: number;
};

/** Normalised email for every student flow, so sign-in finds the account sign-up created. */
export function studentEmail(params: Record<string, Value | undefined>): string {
  if (typeof params.email !== "string") fail("Please enter your email address.");
  return cleanEmail(params.email);
}

/** Shared by email/password sign-up and the "complete your profile" step (Google). */
export function validateSignupAnswers(input: {
  country: unknown;
  ageBand: unknown;
  guardianConsent: unknown;
  termsAccepted: unknown;
  conductAccepted: unknown;
}): StudentSignup {
  if (typeof input.country !== "string") fail("Please choose your country.");
  const country = cleanText(input.country, "Country", 80);
  if (input.ageBand !== "16-17" && input.ageBand !== "18+") {
    fail("CodeCave Academy is for people aged 16 and over. Please confirm your age group.");
  }
  const guardianConsent = input.guardianConsent === true;
  if (input.ageBand === "16-17" && !guardianConsent) {
    fail("If you're 16 or 17, a parent or guardian must agree to you using CodeCave Academy.");
  }
  if (input.termsAccepted !== true) fail("Please accept the Terms of Service and Privacy Policy.");
  if (input.conductAccepted !== true) fail("Please accept the community code of conduct.");
  const now = Date.now();
  return {
    country,
    ageBand: input.ageBand,
    guardianConsent,
    termsAcceptedAt: now,
    conductAcceptedAt: now,
  };
}

export function studentProfile(params: Record<string, Value | undefined>) {
  const email = studentEmail(params);
  if (params.flow !== "signUp") return { email };
  if (typeof params.name !== "string") fail("Please enter your name.");
  const name = cleanText(params.name, "Name", 80);
  const signup = validateSignupAnswers({
    country: params.country,
    ageBand: params.ageBand,
    guardianConsent: params.guardianConsent,
    termsAccepted: params.termsAccepted,
    conductAccepted: params.conductAccepted,
  });
  return { email, name, signup };
}

export function validateStudentPassword(password: string) {
  if (typeof password !== "string" || password.length < 8) {
    throw new ConvexError("Your password must be at least 8 characters.");
  }
  if (password.length > 128) throw new ConvexError("Your password is too long (maximum 128 characters).");
  if (/^\d+$/.test(password)) throw new ConvexError("Your password can't be only numbers.");
}
