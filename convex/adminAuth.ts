import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { staffRole } from "./schema";
import { SITE_ROLES, getStaffProfile, logAudit, requireRole } from "./permissions";

/**
 * Call at the top of every site-admin query/mutation:
 *   const admin = await requireAdmin(ctx);
 * Throws unless the caller is signed in AND has a staff role that may
 * manage the public site (owner or editor). Instructors and moderators
 * are staff too, but they can't touch site content or submissions.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return await requireRole(ctx, SITE_ROLES);
}

/** Lets the signed-in admin confirm they're actually logged in (used by the dashboard's auth guard). */
export const whoAmI = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await getStaffProfile(ctx, userId);
    if (!profile) return null;
    const user = await ctx.db.get(userId);
    return {
      email: user?.email ?? null,
      role: profile.role,
      canManageSite: SITE_ROLES.includes(profile.role),
      canManageTeam: profile.role === "owner",
    };
  },
});

/**
 * Staff accounts are NOT self-service. The public sign-up path on the
 * admin ("password") provider is closed (see convex/auth.ts), so this is
 * the only way to create one. It's an internalAction — unreachable from
 * the public API; run it with your Convex CLI login:
 *
 *   npx convex run adminAuth:createAdmin '{"email":"you@example.com","password":"a-long-passphrase","role":"owner"}'
 *
 * Use a lowercase email (the admin login form sends the email exactly as typed).
 */
export const createAdmin = internalAction({
  args: { email: v.string(), password: v.string(), role: v.optional(staffRole) },
  handler: async (ctx, { email, password, role }): Promise<string> => {
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("That doesn't look like an email address.");
    if (password.length < 12) throw new Error("Use a password of at least 12 characters for staff accounts.");
    await createAccount(ctx, {
      provider: "password",
      account: { id: clean, secret: password },
      profile: { email: clean },
    });
    await ctx.runMutation(internal.adminAuth.promoteToAdmin, { email: clean, role: role ?? "owner" });
    return `Created ${clean} as ${role ?? "owner"}.`;
  },
});

/**
 * Grants (or changes) the staff role of an EXISTING admin-login account.
 * Internal — only reachable via the CLI or the dashboard function runner:
 *
 *   npx convex run adminAuth:promoteToAdmin '{"email":"you@example.com","role":"editor"}'
 *
 * The account is found through the admin ("password") login, never by
 * matching the shared users table on email — so a student who signs up
 * with someone's email address can't be promoted by mistake.
 */
export const promoteToAdmin = internalMutation({
  args: { email: v.string(), role: v.optional(staffRole) },
  handler: async (ctx, { email, role }) => {
    const wanted = email.trim();
    let account = null;
    for (const id of [wanted, wanted.toLowerCase()]) {
      account = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) => q.eq("provider", "password").eq("providerAccountId", id))
        .unique();
      if (account) break;
    }
    if (!account) {
      throw new Error(
        `No admin-login account found for ${email}. Create it first with adminAuth:createAdmin.`
      );
    }
    const existing = await getStaffProfile(ctx, account.userId);
    if (existing) {
      if (role && role !== existing.role) {
        await ctx.db.patch(existing._id, { role });
        await logAudit(ctx, { action: "staff.role_set", target: String(account.userId), detail: `${existing.role} -> ${role} (cli)` });
      }
      return existing._id;
    }
    const id = await ctx.db.insert("adminProfiles", {
      userId: account.userId,
      role: role ?? "owner",
      addedAt: Date.now(),
    });
    await logAudit(ctx, { action: "staff.granted", target: String(account.userId), detail: `${role ?? "owner"} (cli)` });
    return id;
  },
});
