import { ConvexError } from "convex/values";

/**
 * Turns whatever the server threw into a sentence a student can act on.
 * Our own validation / rate-limit errors are ConvexErrors carrying a plain
 * message. Anything else (a library error, a network problem) is shown as
 * the fallback — we never show raw server text like "[Request ID: …] Server Error".
 */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You appear to be offline. Check your connection and try again.";
  }
  return fallback;
}

/** True only for errors we wrote on purpose (validation, rate limits). */
export function isFriendly(err: unknown): boolean {
  return err instanceof ConvexError && typeof err.data === "string";
}
