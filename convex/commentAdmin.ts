import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { MODERATION_ROLES, logAudit, requireRole } from "./permissions";
import { fail } from "./validation";

/** Moderation queue for lesson comments (owner, editor, moderator). */

export const listQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, MODERATION_ROLES);
    const reported = await ctx.db.query("comments").withIndex("by_status", (q) => q.eq("status", "reported")).take(100);
    const out = [];
    for (const c of reported) {
      const lesson = await ctx.db.get(c.lessonId);
      const author = await ctx.db.get(c.userId);
      const reports = await ctx.db.query("commentReports").withIndex("by_comment_user", (q) => q.eq("commentId", c._id)).take(50);
      out.push({ _id: c._id, body: c.body, createdAt: c.createdAt, lessonTitle: lesson?.title ?? "(deleted lesson)", authorEmail: author?.email ?? null, reportCount: reports.length });
    }
    return out;
  },
});

export const setStatus = mutation({
  args: { commentId: v.id("comments"), status: v.union(v.literal("visible"), v.literal("hidden")) },
  handler: async (ctx, { commentId, status }) => {
    const { userId } = await requireRole(ctx, MODERATION_ROLES);
    const c = await ctx.db.get(commentId);
    if (!c) fail("That comment no longer exists.");
    await ctx.db.patch(commentId, { status });
    await logAudit(ctx, { actorId: userId, action: `comment.${status}`, target: commentId });
  },
});
