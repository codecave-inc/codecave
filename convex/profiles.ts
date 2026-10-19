import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getStaffProfile } from "./permissions";
import { cleanText } from "./validation";
import { validateSignupAnswers } from "./studentSignup";

/**
 * The signed-in student's own profile. Identity always comes from the
 * session — these functions never take a user id as an argument.
 */

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const staff = await getStaffProfile(ctx, userId);
    return {
      email: user.email ?? null,
      name: user.name ?? null,
      emailVerified: user.emailVerificationTime !== undefined,
      country: profile?.country ?? null,
      ageBand: profile?.ageBand ?? null,
      // Learners must confirm age / terms / code of conduct before using the
      // Academy. Pure staff accounts (no learner profile) are exempt.
      needsProfileCompletion: profile ? profile.signupCompletedAt === undefined : staff === null,
      staffRole: staff?.role ?? null,
    };
  },
});

export const completeProfile = mutation({
  args: {
    name: v.string(),
    country: v.string(),
    ageBand: v.union(v.literal("16-17"), v.literal("18+")),
    guardianConsent: v.optional(v.boolean()),
    termsAccepted: v.boolean(),
    conductAccepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in.");
    const name = cleanText(args.name, "Name", 80);
    const signup = validateSignupAnswers({ ...args, guardianConsent: args.guardianConsent ?? false });
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const fields = { ...signup, signupCompletedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("profiles", { userId, createdAt: Date.now(), ...fields });
    await ctx.db.patch(userId, { name });
  },
});
