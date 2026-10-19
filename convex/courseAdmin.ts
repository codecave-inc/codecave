import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { CONTENT_ROLES, SITE_ROLES, logAudit, requireRole } from "./permissions";
import { cleanOptionalText, cleanText, fail } from "./validation";
import { cleanLesson, cleanSlug, courseStatus, courseType, lessonContent } from "./courseValidation";
import { parseTranscript } from "./transcript";
import { WEB_DEV_COURSE } from "./outlineData";

/**
 * Admin-side course management. Every function starts with requireRole;
 * identity always comes from the session. Instructors can edit content;
 * only owners/editors can delete courses.
 */

const MAX_COURSES = 100;

export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, CONTENT_ROLES);
    const courses = await ctx.db.query("courses").take(MAX_COURSES);
    const rows = [];
    for (const c of courses) {
      const lessons = await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", c._id)).take(500);
      rows.push({ ...c, lessonCount: lessons.length, publishedLessons: lessons.filter((l) => l.status === "published").length });
    }
    return rows.sort((a, b) => a.recommendedOrder - b.recommendedOrder);
  },
});

export const getCourseTree = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    await requireRole(ctx, CONTENT_ROLES);
    const course = await ctx.db.get(courseId);
    if (!course) return null;
    const modules = await ctx.db.query("modules").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(100);
    const lessons = await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(500);
    const waitlist = await ctx.db.query("waitlist").withIndex("by_course_email", (q) => q.eq("courseId", courseId)).take(1000);
    return { course, modules, lessons, waitlistCount: waitlist.length };
  },
});

export const transcriptInfo = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    await requireRole(ctx, CONTENT_ROLES);
    const chunks = await ctx.db.query("transcriptChunks").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).take(1500);
    return { chunkCount: chunks.length, preview: chunks.slice(0, 2).map((c) => c.text) };
  },
});

const setupItem = v.object({ id: v.string(), title: v.string(), detail: v.string() });

function cleanSetup(items: { id: string; title: string; detail: string }[] | undefined) {
  if (!items) return undefined;
  if (items.length > 30) fail("The setup guide has too many items (maximum 30).");
  const seen = new Set<string>();
  return items.map((it) => {
    const id = cleanSlug(it.id);
    if (seen.has(id)) fail("Setup guide items must have different ids.");
    seen.add(id);
    return { id, title: cleanText(it.title, "Setup item title", 160), detail: cleanOptionalText(it.detail, "Setup item detail", 1500) ?? "" };
  });
}

async function assertSlugFree(ctx: MutationCtx, slug: string, exceptId?: Id<"courses">) {
  const clash = await ctx.db.query("courses").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
  if (clash && clash._id !== exceptId) fail("Another course already uses that web address name.");
}

export const createCourse = mutation({
  args: { slug: v.string(), title: v.string(), type: courseType, description: v.string(), tagline: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const { userId } = await requireRole(ctx, CONTENT_ROLES);
    const slug = cleanSlug(a.slug);
    await assertSlugFree(ctx, slug);
    const existing = await ctx.db.query("courses").take(MAX_COURSES);
    const id = await ctx.db.insert("courses", {
      slug,
      title: cleanText(a.title, "Title", 120),
      type: a.type,
      status: "draft",
      tagline: cleanOptionalText(a.tagline, "Tagline", 200),
      description: cleanText(a.description, "Description", 3000),
      recommendedOrder: existing.length + 1,
      createdAt: Date.now(),
    });
    await logAudit(ctx, { actorId: userId, action: "course.create", target: id });
    return id;
  },
});

export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    slug: v.string(),
    title: v.string(),
    status: courseStatus,
    tagline: v.optional(v.string()),
    description: v.string(),
    thumbnailUrl: v.optional(v.string()),
    recommendedOrder: v.number(),
    setupGuide: v.optional(v.array(setupItem)),
  },
  handler: async (ctx, a) => {
    const { userId } = await requireRole(ctx, CONTENT_ROLES);
    const course = await ctx.db.get(a.courseId);
    if (!course) fail("That course no longer exists.");
    const slug = cleanSlug(a.slug);
    await assertSlugFree(ctx, slug, a.courseId);
    if (!Number.isInteger(a.recommendedOrder) || a.recommendedOrder < 1 || a.recommendedOrder > 999) fail("Order must be a whole number from 1 to 999.");
    await ctx.db.patch(a.courseId, {
      slug,
      title: cleanText(a.title, "Title", 120),
      status: a.status,
      tagline: cleanOptionalText(a.tagline, "Tagline", 200),
      description: cleanText(a.description, "Description", 3000),
      thumbnailUrl: cleanOptionalText(a.thumbnailUrl, "Thumbnail link", 500),
      recommendedOrder: a.recommendedOrder,
      setupGuide: cleanSetup(a.setupGuide),
    });
    if (a.status !== course.status) await logAudit(ctx, { actorId: userId, action: "course.status", target: a.courseId, detail: `${course.status} -> ${a.status}` });
  },
});

export const deleteCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    const { userId } = await requireRole(ctx, SITE_ROLES);
    const lesson = await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).first();
    if (lesson) fail("Delete this course's lessons first.");
    const mods = await ctx.db.query("modules").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(100);
    for (const m of mods) await ctx.db.delete(m._id);
    const wl = await ctx.db.query("waitlist").withIndex("by_course_email", (q) => q.eq("courseId", courseId)).take(1000);
    for (const w of wl) await ctx.db.delete(w._id);
    await ctx.db.delete(courseId);
    await logAudit(ctx, { actorId: userId, action: "course.delete", target: courseId });
  },
});

export const createModule = mutation({
  args: { courseId: v.id("courses"), title: v.string(), outcome: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireRole(ctx, CONTENT_ROLES);
    if (!(await ctx.db.get(a.courseId))) fail("That course no longer exists.");
    const mods = await ctx.db.query("modules").withIndex("by_courseId", (q) => q.eq("courseId", a.courseId)).take(100);
    return await ctx.db.insert("modules", {
      courseId: a.courseId,
      number: mods.length + 1,
      order: mods.length + 1,
      title: cleanText(a.title, "Module title", 160),
      outcome: cleanOptionalText(a.outcome, "Module outcome", 1000),
    });
  },
});

export const updateModule = mutation({
  args: { moduleId: v.id("modules"), title: v.string(), outcome: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireRole(ctx, CONTENT_ROLES);
    if (!(await ctx.db.get(a.moduleId))) fail("That module no longer exists.");
    await ctx.db.patch(a.moduleId, { title: cleanText(a.title, "Module title", 160), outcome: cleanOptionalText(a.outcome, "Module outcome", 1000) });
  },
});

export const deleteModule = mutation({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, { moduleId }) => {
    const { userId } = await requireRole(ctx, SITE_ROLES);
    const lesson = await ctx.db.query("lessons").withIndex("by_moduleId", (q) => q.eq("moduleId", moduleId)).first();
    if (lesson) fail("Delete or move this module's lessons first.");
    await ctx.db.delete(moduleId);
    await logAudit(ctx, { actorId: userId, action: "module.delete", target: moduleId });
  },
});

export const reorderModules = mutation({
  args: { courseId: v.id("courses"), ids: v.array(v.id("modules")) },
  handler: async (ctx, { courseId, ids }) => {
    await requireRole(ctx, CONTENT_ROLES);
    const mods = await ctx.db.query("modules").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(100);
    if (ids.length !== mods.length || new Set(ids).size !== ids.length || !ids.every((id) => mods.some((m) => m._id === id))) {
      fail("The module list changed. Reload and try again.");
    }
    for (let i = 0; i < ids.length; i++) await ctx.db.patch(ids[i], { order: i + 1, number: i + 1 });
  },
});

export const createLesson = mutation({
  args: { courseId: v.id("courses"), moduleId: v.optional(v.id("modules")), title: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, CONTENT_ROLES);
    const course = await ctx.db.get(a.courseId);
    if (!course) fail("That course no longer exists.");
    if (a.moduleId) {
      const m = await ctx.db.get(a.moduleId);
      if (!m || m.courseId !== a.courseId) fail("That module doesn't belong to this course.");
    } else if (course.type === "focused") {
      fail("Lessons in a focused course must belong to a module.");
    }
    const all = await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", a.courseId)).take(500);
    const n = all.length + 1;
    return await ctx.db.insert("lessons", {
      courseId: a.courseId, moduleId: a.moduleId, number: n, order: n,
      title: cleanText(a.title, "Lesson title", 160), status: "draft", isFreePreview: false, summary: "",
      durationSec: 0, objectives: [], keyConcepts: [], notesMd: "", promptCards: [], taskMd: "", pitfalls: [],
      chapters: [], tools: [], studentOutput: "", evidenceMd: "", assetsNote: "", resources: [], recordingFlow: [],
    });
  },
});

export const updateLesson = mutation({
  args: { lessonId: v.id("lessons"), content: lessonContent },
  handler: async (ctx, { lessonId, content }) => {
    const { userId } = await requireRole(ctx, CONTENT_ROLES);
    const lesson = await ctx.db.get(lessonId);
    if (!lesson) fail("That lesson no longer exists.");
    const clean = cleanLesson(content);
    if (content.status === "published" && !clean.youtubeVideoId) fail("Add the YouTube video before publishing this lesson.");
    await ctx.db.patch(lessonId, {
      ...clean,
      status: content.status,
      isFreePreview: content.isFreePreview,
      ...(content.verified ? { lastVerifiedAt: Date.now() } : {}),
    });
    if (content.status !== lesson.status) await logAudit(ctx, { actorId: userId, action: "lesson.status", target: lessonId, detail: `${lesson.status} -> ${content.status}` });
  },
});

export const deleteLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const { userId } = await requireRole(ctx, SITE_ROLES);
    const chunks = await ctx.db.query("transcriptChunks").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).take(1500);
    for (const c of chunks) await ctx.db.delete(c._id);
    await ctx.db.delete(lessonId);
    await logAudit(ctx, { actorId: userId, action: "lesson.delete", target: lessonId });
  },
});

export const reorderLessons = mutation({
  args: { courseId: v.id("courses"), moduleId: v.optional(v.id("modules")), ids: v.array(v.id("lessons")) },
  handler: async (ctx, { courseId, moduleId, ids }) => {
    await requireRole(ctx, CONTENT_ROLES);
    const all = await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(500);
    const group = all.filter((l) => l.moduleId === moduleId);
    if (ids.length !== group.length || new Set(ids).size !== ids.length || !ids.every((id) => group.some((l) => l._id === id))) {
      fail("The lesson list changed. Reload and try again.");
    }
    // Lesson numbers run across the whole course, so renumber everything.
    const slots = group.map((l) => l.order).sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) await ctx.db.patch(ids[i], { order: slots[i] });
    const after = (await ctx.db.query("lessons").withIndex("by_courseId", (q) => q.eq("courseId", courseId)).take(500));
    after.sort((a, b) => a.order - b.order);
    for (let i = 0; i < after.length; i++) if (after[i].number !== i + 1) await ctx.db.patch(after[i]._id, { number: i + 1 });
  },
});

export const setTranscript = mutation({
  args: { lessonId: v.id("lessons"), text: v.string() },
  handler: async (ctx, { lessonId, text }) => {
    await requireRole(ctx, CONTENT_ROLES);
    if (!(await ctx.db.get(lessonId))) fail("That lesson no longer exists.");
    const chunks = parseTranscript(text);
    const old = await ctx.db.query("transcriptChunks").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).take(1500);
    for (const c of old) await ctx.db.delete(c._id);
    for (let i = 0; i < chunks.length; i++) await ctx.db.insert("transcriptChunks", { lessonId, order: i, ...chunks[i] });
    return { chunkCount: chunks.length };
  },
});

export const clearTranscript = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    await requireRole(ctx, CONTENT_ROLES);
    const old = await ctx.db.query("transcriptChunks").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).take(1500);
    for (const c of old) await ctx.db.delete(c._id);
  },
});

/**
 * One-click import of the AI-Assisted Web Development outline (7 modules,
 * 21 lessons). Everything lands as a DRAFT for review. Safe to click twice:
 * if the course already exists nothing is changed.
 */
export const importWebDevOutline = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, CONTENT_ROLES);
    const c = WEB_DEV_COURSE;
    const exists = await ctx.db.query("courses").withIndex("by_slug", (q) => q.eq("slug", c.slug)).first();
    if (exists) return { created: false as const, courseId: exists._id };
    const courseId = await ctx.db.insert("courses", {
      slug: c.slug, title: c.title, type: "focused", status: "draft", tagline: c.tagline, description: c.description,
      recommendedOrder: 1, setupGuide: c.setupGuide.map((s) => ({ ...s })), createdAt: Date.now(),
    });
    let n = 0;
    for (const m of c.modules) {
      const moduleId = await ctx.db.insert("modules", { courseId, number: m.number, order: m.number, title: m.title, outcome: m.outcome });
      for (const l of m.lessons) {
        n++;
        await ctx.db.insert("lessons", {
          courseId, moduleId, number: l.number, order: l.number, title: l.title, status: "draft",
          isFreePreview: l.number === 1, summary: l.purpose, durationSec: l.durationMin * 60,
          objectives: [...l.objectives], keyConcepts: [...l.keyConcepts], notesMd: "",
          promptCards: l.prompt ? [{ title: "Starter prompt", prompt: l.prompt }] : [],
          taskMd: l.task, pitfalls: [...l.pitfalls], chapters: [], tools: [...l.tools],
          studentOutput: l.studentOutput, evidenceMd: l.evidence, assetsNote: l.assets, resources: [],
          recordingFlow: [...l.recordingFlow],
        });
      }
    }
    await logAudit(ctx, { actorId: userId, action: "course.import", target: courseId, detail: `${n} lessons` });
    return { created: true as const, courseId };
  },
});
