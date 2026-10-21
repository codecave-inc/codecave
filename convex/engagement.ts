import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { currentUser, lessonAccess } from "./entitlements";
import { rateLimiter } from "./rateLimits";
import { cleanOptionalText, cleanText, fail } from "./validation";
import { getStaffProfile } from "./permissions";

/** Notes, ratings and comments. Everything requires access to the lesson itself. */

async function requireLessonAccess(ctx: QueryCtx | MutationCtx, lessonId: Id<"lessons">) {
  const userId = await currentUser(ctx);
  const lesson = await ctx.db.get(lessonId);
  if (!userId || !lesson) fail("Please sign in.");
  const access = await lessonAccess(ctx, userId, lesson);
  if (!access.ok) fail("This lesson isn't available.");
  return { userId, lesson };
}

const MAX_NOTES_PER_LESSON = 200;

// ---------------------------------------------------------------- notes

export const listNotes = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("notes").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lessonId)).take(MAX_NOTES_PER_LESSON);
    return rows.map((n) => ({ _id: n._id, timestampSec: n.timestampSec, body: n.body, createdAt: n.createdAt }));
  },
});

export const addNote = mutation({
  args: { lessonId: v.id("lessons"), timestampSec: v.number(), body: v.string() },
  handler: async (ctx, a) => {
    const { userId, lesson } = await requireLessonAccess(ctx, a.lessonId);
    const body = cleanText(a.body, "Note", 2000);
    if (!Number.isFinite(a.timestampSec) || a.timestampSec < 0 || a.timestampSec > Math.max(lesson.durationSec * 2, 4 * 3600)) fail("That time isn't valid.");
    const lim = await rateLimiter.limit(ctx, "notePerUser", { key: userId });
    if (!lim.ok) throw new ConvexError("You're saving notes very quickly. Please wait a moment.");
    const existing = await ctx.db.query("notes").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", a.lessonId)).take(MAX_NOTES_PER_LESSON);
    if (existing.length >= MAX_NOTES_PER_LESSON) fail("You've reached the note limit for this lesson.");
    return await ctx.db.insert("notes", { userId, lessonId: a.lessonId, timestampSec: Math.floor(a.timestampSec), body, createdAt: Date.now() });
  },
});

export const updateNote = mutation({
  args: { noteId: v.id("notes"), body: v.string() },
  handler: async (ctx, { noteId, body }) => {
    const userId = await currentUser(ctx);
    const note = await ctx.db.get(noteId);
    if (!userId || !note || note.userId !== userId) fail("That note doesn't exist.");
    await ctx.db.patch(noteId, { body: cleanText(body, "Note", 2000) });
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const userId = await currentUser(ctx);
    const note = await ctx.db.get(noteId);
    if (!userId || !note || note.userId !== userId) fail("That note doesn't exist.");
    await ctx.db.delete(noteId);
  },
});

// -------------------------------------------------------------- ratings

export const myRating = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    if (!userId) return null;
    const r = await ctx.db.query("ratings").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lessonId)).first();
    return r ? { stars: r.stars, feedback: r.feedback ?? "" } : null;
  },
});

export const rate = mutation({
  args: { lessonId: v.id("lessons"), stars: v.number(), feedback: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const { userId } = await requireLessonAccess(ctx, a.lessonId);
    if (!Number.isInteger(a.stars) || a.stars < 1 || a.stars > 5) fail("Please choose 1 to 5 stars.");
    const feedback = cleanOptionalText(a.feedback, "Feedback", 300);
    const existing = await ctx.db.query("ratings").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", a.lessonId)).first();
    const fields = { stars: a.stars, feedback, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("ratings", { userId, lessonId: a.lessonId, ...fields });
  },
});

// ------------------------------------------------------------- comments

const MAX_COMMENTS = 300;

function displayName(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Student";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export const listComments = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!userId || !lesson) return [];
    const access = await lessonAccess(ctx, userId, lesson);
    if (!access.ok) return [];
    const rows = (await ctx.db.query("comments").withIndex("by_lesson", (q) => q.eq("lessonId", lessonId)).take(MAX_COMMENTS)).filter((c) => c.status !== "hidden");
    const authors = new Map<string, { name: string; staff: boolean }>();
    for (const c of rows) {
      if (authors.has(c.userId)) continue;
      const u = await ctx.db.get(c.userId);
      const staff = await getStaffProfile(ctx, c.userId);
      authors.set(c.userId, { name: displayName(u?.name), staff: staff !== null });
    }
    const shape = (c: (typeof rows)[number]) => ({
      _id: c._id, body: c.body, createdAt: c.createdAt, mine: c.userId === userId,
      author: authors.get(c.userId)!.name, isStaff: authors.get(c.userId)!.staff, reported: c.status === "reported",
    });
    return rows
      .filter((c) => !c.parentId)
      .map((c) => ({ ...shape(c), replies: rows.filter((r) => r.parentId === c._id).map(shape) }));
  },
});

export const addComment = mutation({
  args: { lessonId: v.id("lessons"), body: v.string(), parentId: v.optional(v.id("comments")) },
  handler: async (ctx, a) => {
    const { userId } = await requireLessonAccess(ctx, a.lessonId);
    const body = cleanText(a.body, "Comment", 1500);
    if (a.parentId) {
      const parent = await ctx.db.get(a.parentId);
      if (!parent || parent.lessonId !== a.lessonId || parent.status === "hidden") fail("That comment is no longer there.");
      if (parent.parentId) fail("You can only reply to a top-level comment.");
    }
    const lim = await rateLimiter.limit(ctx, "commentPerUser", { key: userId });
    if (!lim.ok) throw new ConvexError("You're commenting very quickly. Please wait a little while.");
    await ctx.db.insert("comments", { lessonId: a.lessonId, userId, parentId: a.parentId, body, status: "visible", createdAt: Date.now() });
  },
});

export const reportComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const userId = await currentUser(ctx);
    const c = await ctx.db.get(commentId);
    if (!userId || !c) fail("That comment is no longer there.");
    await requireLessonAccess(ctx, c.lessonId);
    if (c.userId === userId) fail("You can't report your own comment.");
    const dup = await ctx.db.query("commentReports").withIndex("by_comment_user", (q) => q.eq("commentId", commentId).eq("userId", userId)).first();
    if (dup) return;
    await ctx.db.insert("commentReports", { commentId, userId, createdAt: Date.now() });
    if (c.status === "visible") await ctx.db.patch(commentId, { status: "reported" });
  },
});

export const deleteMyComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const userId = await currentUser(ctx);
    const c = await ctx.db.get(commentId);
    if (!userId || !c || c.userId !== userId) fail("That comment isn't yours.");
    await ctx.db.patch(commentId, { status: "hidden" });
  },
});
