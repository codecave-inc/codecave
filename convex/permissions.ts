import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Staff authorization — the single place that answers "is this caller
 * allowed to do this?". Every admin query/mutation must start with
 * `requireRole(...)` (or `requireAdmin`, which is requireRole for the
 * site roles). Identity is ALWAYS derived server-side from the session;
 * never accept a user id from the client for authorization.
 */

export type StaffRole = Doc<"adminProfiles">["role"];

/** Roles that may manage the public-site content and form submissions. */
export const SITE_ROLES: readonly StaffRole[] = ["owner", "editor"];
/** Roles that may create and edit Academy courses and lessons. */
export const CONTENT_ROLES: readonly StaffRole[] = ["owner", "editor", "instructor"];
/** Super Admin only (team management, audit log). */
export const OWNER_ONLY: readonly StaffRole[] = ["owner"];

type Ctx = QueryCtx | MutationCtx;

export async function getStaffProfile(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("adminProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export async function requireRole(ctx: Ctx, allowed: readonly StaffRole[]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in.");
  const profile = await getStaffProfile(ctx, userId);
  if (!profile) throw new Error("This account doesn't have admin access.");
  if (!allowed.includes(profile.role)) {
    throw new Error("Your role doesn't allow this action.");
  }
  return { userId, role: profile.role };
}

/** Append-only record of a security-relevant action. */
export async function logAudit(
  ctx: MutationCtx,
  entry: { actorId?: Id<"users">; action: string; target?: string; detail?: string }
) {
  await ctx.db.insert("auditLog", { ...entry, createdAt: Date.now() });
}
