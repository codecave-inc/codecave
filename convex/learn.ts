import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { currentUser, lessonAccess } from "./entitlements";
import { rateLimiter } from "./rateLimits";
import { COMPLETE_AT_PCT, addSegment, effectiveVideoSec, percent, totalSeconds } from "./progressMath";
import { fail } from "./validation";

/**
 * Student-facing lesson functions. Every one resolves the caller from the
 * session and asks lessonAccess() before returning anything that isn't
 * public. The video id is only ever returned by `requestVideo`.
 */

async function orderedLessons(ctx: Parameters<typeof lessonAccess>[0], courseId: Doc<"lessons">["courseId"]) {
  const all = await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(500);
  return all.sort((a, b) => a.order - b.order);
}

export const lesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    const l = await ctx.db.get(lessonId);
    if (!userId || !l) return null;
    const access = await lessonAccess(ctx, userId, l);
    if (!access.ok && access.reason === "not_available") return null;
    const course = await ctx.db.get(l.courseId);
    if (!course) return null;
    const mod = l.moduleId ? await ctx.db.get(l.moduleId) : null;
    const siblings = (await orderedLessons(ctx, l.courseId)).filter((x) => x.status === "published" || (access.ok && access.staffPreview));
    const i = siblings.findIndex((x) => x._id === l._id);
    const nav = {
      prev: i > 0 ? { _id: siblings[i - 1]._id, title: siblings[i - 1].title, number: siblings[i - 1].number } : null,
      next: i >= 0 && i < siblings.length - 1 ? { _id: siblings[i + 1]._id, title: siblings[i + 1].title, number: siblings[i + 1].number } : null,
    };
    const base = {
      _id: l._id, number: l.number, title: l.title, summary: l.summary, durationSec: l.durationSec,
      isFreePreview: l.isFreePreview, objectives: l.objectives,
    };
    const where = { courseId: course._id, courseSlug: course.slug, courseTitle: course.title, moduleTitle: mod?.title ?? null, moduleNumber: mod?.number ?? null };
    if (!access.ok) return { access: { ok: false as const, reason: access.reason }, lesson: base, ...where, nav, content: null, progress: null };
    const progress = await ctx.db.query("lessonProgress").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lessonId)).first();
    return {
      access: { ok: true as const, staffPreview: access.staffPreview },
      lesson: base,
      ...where,
      nav,
      content: {
        keyConcepts: l.keyConcepts, notesMd: l.notesMd, promptCards: l.promptCards, taskMd: l.taskMd, pitfalls: l.pitfalls,
        chapters: l.chapters, tools: l.tools, studentOutput: l.studentOutput, evidenceMd: l.evidenceMd, assetsNote: l.assetsNote,
        resources: l.resources, lastVerifiedAt: l.lastVerifiedAt ?? null, hasVideo: !!l.youtubeVideoId,
      },
      progress: progress ? { watchedPct: progress.watchedPct, lastPositionSec: progress.lastPositionSec, videoComplete: progress.videoComplete } : null,
    };
  },
});

/** The ONLY way the YouTube id leaves the server. Rate-limited and logged per account. */
export const requestVideo = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    const l = await ctx.db.get(lessonId);
    if (!userId || !l) fail("Please sign in to watch.");
    const access = await lessonAccess(ctx, userId, l);
    if (!access.ok) {
      if (access.reason === "pro_required") fail("This lesson is part of Pro.");
      fail("This lesson isn't available.");
    }
    const lim = await rateLimiter.limit(ctx, "videoRequestPerUser", { key: userId });
    if (!lim.ok) throw new ConvexError("You're opening a lot of videos. Please wait a few minutes and try again.");
    if (!l.youtubeVideoId) fail("The video for this lesson isn't uploaded yet.");
    await ctx.db.insert("videoRequests", { userId, lessonId, at: Date.now() });
    const progress = await ctx.db.query("lessonProgress").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lessonId)).first();
    const resume = progress && !progress.videoComplete ? progress.lastPositionSec : 0;
    return { videoId: l.youtubeVideoId, resumeSec: Math.max(0, resume - 3) };
  },
});

export const transcript = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    const l = await ctx.db.get(lessonId);
    if (!userId || !l) return [];
    const access = await lessonAccess(ctx, userId, l);
    if (!access.ok) return [];
    const chunks = await ctx.db.query("transcriptChunks").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).take(1500);
    return chunks.map((c) => ({ startSec: c.startSec, text: c.text }));
  },
});

export const saveProgress = mutation({
  args: {
    lessonId: v.id("lessons"),
    segment: v.optional(v.object({ start: v.number(), end: v.number() })),
    positionSec: v.number(),
    playerDurationSec: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const userId = await currentUser(ctx);
    const l = await ctx.db.get(a.lessonId);
    if (!userId || !l) fail("Please sign in.");
    const access = await lessonAccess(ctx, userId, l);
    if (!access.ok) fail("This lesson isn't available.");
    const lim = await rateLimiter.limit(ctx, "progressPerUser", { key: userId });
    if (!lim.ok) return { watchedPct: 0, videoComplete: false, throttled: true as const };
    if (!Number.isFinite(a.positionSec)) fail("Bad position.");
    const now = Date.now();
    const videoSec = effectiveVideoSec(l.durationSec, a.playerDurationSec);
    const row = await ctx.db.query("lessonProgress").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", a.lessonId)).first();
    let ranges = row?.watchedRanges ?? [];
    if (a.segment && Number.isFinite(a.segment.start) && Number.isFinite(a.segment.end)) {
      ranges = addSegment(ranges, a.segment, { videoSec, elapsedSec: row ? (now - row.lastSavedAt) / 1000 : null });
    }
    const watchedSec = totalSeconds(ranges);
    const pct = percent(watchedSec, videoSec);
    // Once complete, a lesson stays complete.
    const videoComplete = (row?.videoComplete ?? false) || pct >= COMPLETE_AT_PCT;
    const position = Math.min(Math.max(0, a.positionSec), Math.max(videoSec, 0));
    const fields = { watchedRanges: ranges, watchedSec, watchedPct: pct, lastPositionSec: position, videoComplete, lastSavedAt: now };
    if (row) await ctx.db.patch(row._id, fields);
    else {
      await ctx.db.insert("lessonProgress", { userId, lessonId: a.lessonId, courseId: l.courseId, ...fields });
      const enrolled = await ctx.db.query("enrollments").withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", l.courseId)).first();
      if (!enrolled) await ctx.db.insert("enrollments", { userId, courseId: l.courseId, startedAt: now });
    }
    return { watchedPct: pct, videoComplete, throttled: false as const };
  },
});

/** Per-lesson progress for the course outline. */
export const courseProgress = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    const userId = await currentUser(ctx);
    if (!userId) return {};
    const rows = await ctx.db.query("lessonProgress").withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", courseId)).take(500);
    const out: Record<string, { pct: number; complete: boolean }> = {};
    for (const r of rows) out[r.lessonId] = { pct: r.watchedPct, complete: r.videoComplete };
    return out;
  },
});

/** The lesson to offer as "Continue where you left off" on the home page. */
export const continueLearning = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUser(ctx);
    if (!userId) return null;
    const recent = await ctx.db.query("lessonProgress").withIndex("by_user_updated", (q) => q.eq("userId", userId)).order("desc").take(5);
    for (const r of recent) {
      const l = await ctx.db.get(r.lessonId);
      const c = l ? await ctx.db.get(r.courseId) : null;
      if (!l || !c || c.status !== "published" || l.status !== "published") continue;
      return { lessonId: l._id, lessonTitle: l.title, lessonNumber: l.number, courseTitle: c.title, courseSlug: c.slug, pct: r.watchedPct, complete: r.videoComplete };
    }
    return null;
  },
});
