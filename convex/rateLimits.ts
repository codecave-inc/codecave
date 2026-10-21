import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

/**
 * Rate limits for everything an anonymous visitor can trigger that
 * costs us something (an email sent from our domain, a database row).
 * Uses the @convex-dev/rate-limiter component, so limits are race-free.
 *
 * "per address" limits stop someone using us to spam a victim's inbox;
 * "global" limits cap the damage (and the Brevo quota) of a flood from
 * many addresses.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  formPerEmail: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
  formGlobal: { kind: "token bucket", rate: 150, period: HOUR, capacity: 100 },
  authEmailPerAddress: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
  authEmailGlobal: { kind: "token bucket", rate: 150, period: HOUR, capacity: 100 },
  // Signed-in learners (Phase 3)
  videoRequestPerUser: { kind: "token bucket", rate: 60, period: HOUR, capacity: 30 },
  progressPerUser: { kind: "token bucket", rate: 1500, period: HOUR, capacity: 120 },
  commentPerUser: { kind: "token bucket", rate: 12, period: HOUR, capacity: 6 },
  notePerUser: { kind: "token bucket", rate: 120, period: HOUR, capacity: 30 },
});

/** Call from every public form mutation, with the cleaned email. */
export async function limitFormSubmission(ctx: MutationCtx, email: string) {
  const perEmail = await rateLimiter.limit(ctx, "formPerEmail", { key: email });
  if (!perEmail.ok) {
    throw new ConvexError("You've sent a few messages recently. Please wait a little while and try again.");
  }
  const global = await rateLimiter.limit(ctx, "formGlobal");
  if (!global.ok) {
    throw new ConvexError("We're receiving a lot of messages right now. Please try again in a few minutes.");
  }
}
