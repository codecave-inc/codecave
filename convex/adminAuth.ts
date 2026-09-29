import { internalMutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Call at the top of every admin-only query/mutation:
 *   const admin = await requireAdmin(ctx);
 * Throws if the caller isn't signed in or isn't in adminProfiles.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in.");
  const profile = await ctx.db
    .query("adminProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  if (!profile) throw new Error("This account doesn't have admin access.");
  return { userId, role: profile.role };
}

/** Lets the signed-in admin confirm they're actually logged in (used by the dashboard's auth guard). */
export const whoAmI = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("adminProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    const user = await ctx.db.get(userId);
    return { email: (user as any)?.email ?? null, role: profile.role };
  },
});

/**
 * ONE-TIME BOOTSTRAP. This is an internalMutation — it is NOT reachable
 * over the public API, only via `npx convex run` (which requires your
 * Convex CLI login) or the dashboard's function runner. That's what
 * makes it safe to have no other access control on it.
 *
 * Usage (see README): after creating your own account with the sign-in
 * form's underlying `auth:signIn` action (flow: "signUp"), run this once
 * to grant that account admin access:
 *
 *   npx convex run adminAuth:promoteToAdmin '{"email":"you@example.com"}'
 */
export const promoteToAdmin = internalMutation({
  args: { email: v.string(), role: v.optional(v.union(v.literal("owner"), v.literal("editor"))) },
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (!user) throw new Error(`No user found with email ${email}. Sign up first, then promote.`);
    const existing = await ctx.db
      .query("adminProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("adminProfiles", {
      userId: user._id,
      role: role ?? "owner",
      addedAt: Date.now(),
    });
  },
});
