import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { staffRole } from "./schema";
import { OWNER_ONLY, logAudit, requireRole } from "./permissions";

/**
 * Team management — Super Admin (owner) only. Staff accounts are
 * created with the CLI (adminAuth:createAdmin); this is where an owner
 * changes a teammate's role or removes their access.
 */

export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, OWNER_ONLY);
    const rows = await ctx.db.query("adminProfiles").take(200);
    const out = [];
    for (const row of rows) {
      const user = await ctx.db.get(row.userId);
      out.push({ userId: row.userId, email: user?.email ?? null, role: row.role, addedAt: row.addedAt });
    }
    return out.sort((a, b) => a.addedAt - b.addedAt);
  },
});

async function ownerCount(ctx: Parameters<typeof requireRole>[0]) {
  const rows = await ctx.db.query("adminProfiles").take(200);
  return rows.filter((r) => r.role === "owner").length;
}

export const setStaffRole = mutation({
  args: { userId: v.id("users"), role: staffRole },
  handler: async (ctx, { userId, role }) => {
    const actor = await requireRole(ctx, OWNER_ONLY);
    const target = await ctx.db
      .query("adminProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!target) throw new Error("That person isn't on the team.");
    if (target.role === role) return;
    if (target.role === "owner" && role !== "owner" && (await ownerCount(ctx)) <= 1) {
      throw new Error("You can't change the last owner's role — make someone else an owner first.");
    }
    await ctx.db.patch(target._id, { role });
    await logAudit(ctx, {
      actorId: actor.userId,
      action: "staff.role_set",
      target: String(userId),
      detail: `${target.role} -> ${role}`,
    });
  },
});

export const removeStaff = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const actor = await requireRole(ctx, OWNER_ONLY);
    const target = await ctx.db
      .query("adminProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!target) throw new Error("That person isn't on the team.");
    if (target.role === "owner" && (await ownerCount(ctx)) <= 1) {
      throw new Error("You can't remove the last owner.");
    }
    await ctx.db.delete(target._id);
    await logAudit(ctx, {
      actorId: actor.userId,
      action: "staff.removed",
      target: String(userId),
      detail: String(target.role),
    });
  },
});

export const listAuditLog = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireRole(ctx, OWNER_ONLY);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(paginationOpts);
  },
});
