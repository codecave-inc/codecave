import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanEmail, fail } from "./validation";
import { limitFormSubmission } from "./rateLimits";

/**
 * Student-facing course content. Drafts are never returned, and neither
 * are the instructor-only lesson fields (recording flow) or the video id
 * (the lesson page, built in Phase 3, will serve that behind access checks).
 */

export const catalog = query({
  args: {},
  handler: async (ctx) => {
    const visible = [
      ...(await ctx.db.query("courses").withIndex("by_status", (q) => q.eq("status", "published")).take(100)),
      ...(await ctx.db.query("courses").withIndex("by_status", (q) => q.eq("status", "coming_soon")).take(100)),
    ];
    const rows = [];
    for (const c of visible) {
      const lessons = (await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", c._id)).take(500)).filter(
        (l) => l.status !== "draft"
      );
      const modules = c.type === "focused" ? await ctx.db.query("modules").withIndex("by_courseId", (q) => q.eq("courseId", c._id)).take(100) : [];
      rows.push({
        _id: c._id,
        slug: c.slug,
        title: c.title,
        type: c.type,
        status: c.status,
        tagline: c.tagline ?? null,
        thumbnailUrl: c.thumbnailUrl ?? null,
        recommendedOrder: c.recommendedOrder,
        lessonCount: lessons.length,
        moduleCount: modules.length,
        totalSec: lessons.reduce((s, l) => s + l.durationSec, 0),
      });
    }
    return rows.sort((a, b) => a.recommendedOrder - b.recommendedOrder);
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const c = await ctx.db.query("courses").withIndex("by_slug", (q) => q.eq("slug", slug.slice(0, 80))).first();
    if (!c || c.status === "draft") return null;
    const base = {
      _id: c._id,
      slug: c.slug,
      title: c.title,
      type: c.type,
      status: c.status,
      tagline: c.tagline ?? null,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl ?? null,
      hasSetupGuide: (c.setupGuide?.length ?? 0) > 0,
    };
    if (c.status === "coming_soon") return { ...base, modules: [], lessons: [] };
    const lessons = (await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", c._id)).take(500)).filter(
      (l) => l.status !== "draft"
    );
    const modules = await ctx.db.query("modules").withIndex("by_courseId", (q) => q.eq("courseId", c._id)).take(100);
    const shape = (l: (typeof lessons)[number]) => ({
      _id: l._id,
      number: l.number,
      title: l.title,
      summary: l.summary,
      durationSec: l.durationSec,
      isFreePreview: l.isFreePreview,
      status: l.status,
    });
    return {
      ...base,
      modules: modules
        .map((m) => ({
          _id: m._id,
          number: m.number,
          title: m.title,
          outcome: m.outcome ?? null,
          lessons: lessons.filter((l) => l.moduleId === m._id).sort((a, b) => a.order - b.order).map(shape),
        }))
        .filter((m) => m.lessons.length > 0),
      lessons: lessons.filter((l) => !l.moduleId).sort((a, b) => a.order - b.order).map(shape),
    };
  },
});

export const joinWaitlist = mutation({
  args: { courseId: v.id("courses"), email: v.string() },
  handler: async (ctx, a) => {
    const email = cleanEmail(a.email);
    await limitFormSubmission(ctx, email);
    const course = await ctx.db.get(a.courseId);
    if (!course || course.status !== "coming_soon") fail("This course isn't taking a waitlist right now.");
    const dup = await ctx.db.query("waitlist").withIndex("by_course_email", (q) => q.eq("courseId", a.courseId).eq("email", email)).first();
    if (!dup) await ctx.db.insert("waitlist", { email, courseId: a.courseId, createdAt: Date.now() });
    // Same answer either way, so the form can't be used to probe who is on the list.
    return { ok: true as const };
  },
});

export const setupGuide = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const c = await ctx.db.query("courses").withIndex("by_slug", (q) => q.eq("slug", slug.slice(0, 80))).first();
    if (!c || c.status === "draft") return null;
    const userId = await getAuthUserId(ctx);
    const progress = userId
      ? await ctx.db.query("setupProgress").withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", c._id)).first()
      : null;
    return { courseTitle: c.title, items: c.setupGuide ?? [], doneIds: progress?.doneIds ?? [] };
  },
});

export const toggleSetupItem = mutation({
  args: { courseId: v.id("courses"), itemId: v.string(), done: v.boolean() },
  handler: async (ctx, a) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) fail("Please sign in first.");
    const c = await ctx.db.get(a.courseId);
    if (!c || c.status === "draft" || !c.setupGuide?.some((i) => i.id === a.itemId)) fail("That checklist item doesn't exist.");
    const row = await ctx.db.query("setupProgress").withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", a.courseId)).first();
    const current = new Set(row?.doneIds ?? []);
    if (a.done) current.add(a.itemId);
    else current.delete(a.itemId);
    const doneIds = [...current];
    if (row) await ctx.db.patch(row._id, { doneIds });
    else await ctx.db.insert("setupProgress", { userId, courseId: a.courseId, doneIds });
  },
});
