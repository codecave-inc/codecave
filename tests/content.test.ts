/// <reference types="vite/client" />
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { newTest } from "./testSetup";
import { parseTranscript } from "../convex/transcript";
import { cleanYoutubeId } from "../convex/courseValidation";

type T = ReturnType<typeof newTest>;

async function who(t: T, email: string, role?: "owner" | "editor" | "instructor" | "moderator") {
  const id = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, emailVerificationTime: Date.now() });
    if (role) await ctx.db.insert("adminProfiles", { userId, role, addedAt: Date.now() });
    else await ctx.db.insert("profiles", { userId, createdAt: Date.now(), signupCompletedAt: Date.now() });
    return userId;
  });
  return t.withIdentity({ subject: id });
}

const lessonBody = (over: Record<string, unknown> = {}) => ({
  title: "L", status: "draft" as const, isFreePreview: false, summary: "s", durationMin: 34, objectives: [], keyConcepts: [],
  notesMd: "", promptCards: [], taskMd: "", pitfalls: [], chapters: [], tools: [], studentOutput: "", evidenceMd: "",
  assetsNote: "", resources: [], recordingFlow: ["0-3 min: secret instructor plan"], ...over,
});

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://localhost:5174");
});

describe("transcript parsing", () => {
  test("SRT and VTT become timed chunks, merged to a sensible size", () => {
    const srt = "1\n00:00:01,000 --> 00:00:04,000\nHello <i>there</i>\n\n2\n00:00:04,500 --> 00:00:09,000\nWelcome to the course\n";
    expect(parseTranscript(srt)).toEqual([{ startSec: 1, endSec: 9, text: "Hello there Welcome to the course" }]);
    const vtt = "WEBVTT\n\n00:01:00.000 --> 00:01:05.500\nLine one\nline two\n";
    expect(parseTranscript(vtt)).toEqual([{ startSec: 60, endSec: 66, text: "Line one line two" }]);
  });
  test("plain text is accepted untimed; empty is refused", () => {
    expect(parseTranscript("First paragraph.\n\nSecond one.")).toHaveLength(2);
    expect(() => parseTranscript("   \n ")).toThrow(/empty/);
  });
  test("long transcripts split into several chunks", () => {
    const cues = Array.from({ length: 200 }, (_, i) => `${i + 1}\n00:00:${String(i % 60).padStart(2, "0")},000 --> 00:00:${String(i % 60).padStart(2, "0")},900\n${"word ".repeat(12)}`).join("\n\n");
    expect(parseTranscript(cues).length).toBeGreaterThan(5);
  });
});

describe("YouTube ids", () => {
  test("accepts ids and common URLs, rejects junk", () => {
    expect(cleanYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(cleanYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5")).toBe("dQw4w9WgXcQ");
    expect(cleanYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(cleanYoutubeId("  ")).toBeUndefined();
    expect(() => cleanYoutubeId("not a video")).toThrow(/YouTube/);
  });
});

describe("course admin", () => {
  test("instructors edit content but can't delete; moderators and students are refused", async () => {
    const t = newTest();
    const instructor = await who(t, "i@x.co", "instructor");
    const moderator = await who(t, "m@x.co", "moderator");
    const editor = await who(t, "e@x.co", "editor");
    const id = await instructor.mutation(api.courseAdmin.createCourse, { slug: "c1", title: "C1", type: "utility", description: "d" });
    await expect(moderator.mutation(api.courseAdmin.createCourse, { slug: "c2", title: "C2", type: "utility", description: "d" })).rejects.toThrow(/role doesn't allow/);
    await expect(instructor.mutation(api.courseAdmin.deleteCourse, { courseId: id })).rejects.toThrow(/role doesn't allow/);
    await expect(editor.mutation(api.courseAdmin.deleteCourse, { courseId: id })).resolves.toBeNull();
  });

  test("slugs must be clean and unique", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    await expect(owner.mutation(api.courseAdmin.createCourse, { slug: "Bad Slug!", title: "x", type: "utility", description: "d" })).rejects.toThrow(/web address/);
    await owner.mutation(api.courseAdmin.createCourse, { slug: "ok", title: "x", type: "utility", description: "d" });
    await expect(owner.mutation(api.courseAdmin.createCourse, { slug: "ok", title: "y", type: "utility", description: "d" })).rejects.toThrow(/already uses/);
  });

  test("the outline import creates 7 modules and 21 draft lessons, once", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const r1 = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    expect(r1.created).toBe(true);
    const r2 = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    expect(r2).toMatchObject({ created: false, courseId: r1.courseId });
    const tree = await owner.query(api.courseAdmin.getCourseTree, { courseId: r1.courseId });
    expect(tree!.modules).toHaveLength(7);
    expect(tree!.lessons).toHaveLength(21);
    expect(tree!.lessons.every((l) => l.status === "draft")).toBe(true);
    expect(tree!.lessons.filter((l) => l.isFreePreview).map((l) => l.number)).toEqual([1]);
    expect(tree!.lessons.find((l) => l.number === 21)!.durationSec).toBe(40 * 60);
    expect(tree!.lessons.reduce((s, l) => s + l.durationSec, 0)).toBe((20 * 34 + 40) * 60);
    expect(tree!.course.setupGuide!.length).toBeGreaterThan(5);
    const l1 = tree!.lessons.find((l) => l.number === 1)!;
    expect(l1.objectives.length).toBeGreaterThan(2);
    expect(l1.promptCards[0].prompt).toMatch(/development partner/);
  });

  test("a lesson can't be published without a video; the status change is audited", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    const tree = await owner.query(api.courseAdmin.getCourseTree, { courseId });
    const l = tree!.lessons[0];
    await expect(owner.mutation(api.courseAdmin.updateLesson, { lessonId: l._id, content: lessonBody({ status: "published" }) })).rejects.toThrow(/YouTube video/);
    await owner.mutation(api.courseAdmin.updateLesson, { lessonId: l._id, content: lessonBody({ status: "published", youtubeVideoId: "https://youtu.be/dQw4w9WgXcQ", durationMin: 30 }) });
    const after = await t.run((ctx) => ctx.db.get(l._id));
    expect(after).toMatchObject({ status: "published", youtubeVideoId: "dQw4w9WgXcQ", durationSec: 1800 });
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit.some((a) => a.action === "lesson.status")).toBe(true);
  });

  test("bad resource links are refused", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    const l = (await owner.query(api.courseAdmin.getCourseTree, { courseId }))!.lessons[0];
    await expect(owner.mutation(api.courseAdmin.updateLesson, { lessonId: l._id, content: lessonBody({ resources: [{ title: "x", url: "javascript:alert(1)" }] }) })).rejects.toThrow(/web links|https/);
  });

  test("reordering renumbers lessons and refuses stale lists", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    const tree = (await owner.query(api.courseAdmin.getCourseTree, { courseId }))!;
    const m1 = tree.modules[0];
    const inM1 = tree.lessons.filter((l) => l.moduleId === m1._id).sort((a, b) => a.order - b.order);
    await owner.mutation(api.courseAdmin.reorderLessons, { courseId, moduleId: m1._id, ids: [inM1[2]._id, inM1[0]._id, inM1[1]._id] });
    const after = (await owner.query(api.courseAdmin.getCourseTree, { courseId }))!.lessons.sort((a, b) => a.order - b.order);
    expect(after.slice(0, 3).map((l) => l._id)).toEqual([inM1[2]._id, inM1[0]._id, inM1[1]._id]);
    expect(after.map((l) => l.number)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    await expect(owner.mutation(api.courseAdmin.reorderLessons, { courseId, moduleId: m1._id, ids: [inM1[0]._id] })).rejects.toThrow(/changed/);
  });

  test("transcripts replace the old one and can be cleared", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    const l = (await owner.query(api.courseAdmin.getCourseTree, { courseId }))!.lessons[0];
    await owner.mutation(api.courseAdmin.setTranscript, { lessonId: l._id, text: "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nfirst\n" });
    await owner.mutation(api.courseAdmin.setTranscript, { lessonId: l._id, text: "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nsecond\n" });
    expect((await owner.query(api.courseAdmin.transcriptInfo, { lessonId: l._id })).preview).toEqual(["second"]);
    await owner.mutation(api.courseAdmin.clearTranscript, { lessonId: l._id });
    expect((await owner.query(api.courseAdmin.transcriptInfo, { lessonId: l._id })).chunkCount).toBe(0);
  });

  test("a course with lessons can't be deleted", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    await expect(owner.mutation(api.courseAdmin.deleteCourse, { courseId })).rejects.toThrow(/lessons first/);
  });
});

describe("what students can see", () => {
  async function published(t: T) {
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    const tree = (await owner.query(api.courseAdmin.getCourseTree, { courseId }))!;
    const c = tree.course;
    await owner.mutation(api.courseAdmin.updateCourse, { courseId, slug: c.slug, title: c.title, status: "published", description: c.description, recommendedOrder: 1, setupGuide: c.setupGuide });
    const l1 = tree.lessons.find((l) => l.number === 1)!;
    await owner.mutation(api.courseAdmin.updateLesson, { lessonId: l1._id, content: lessonBody({ status: "published", youtubeVideoId: "dQw4w9WgXcQ", isFreePreview: true }) });
    return { owner, courseId, slug: c.slug };
  }

  test("drafts are invisible; a published course shows only non-draft lessons, with no video id or instructor notes", async () => {
    const t = newTest();
    expect(await t.query(api.courses.catalog, {})).toEqual([]);
    const owner = await who(t, "o@x.co", "owner");
    const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
    expect(await t.query(api.courses.catalog, {})).toEqual([]);
    expect(await t.query(api.courses.bySlug, { slug: "ai-website-development" })).toBeNull();
    expect(await t.query(api.courses.setupGuide, { slug: "ai-website-development" })).toBeNull();
    void courseId;

    const t2 = newTest();
    const { slug } = await published(t2);
    const cat = await t2.query(api.courses.catalog, {});
    expect(cat).toHaveLength(1);
    expect(cat[0]).toMatchObject({ lessonCount: 1, moduleCount: 7 });
    const course = (await t2.query(api.courses.bySlug, { slug }))!;
    expect(course.modules).toHaveLength(1);
    expect(course.modules[0].lessons).toHaveLength(1);
    const wire = JSON.stringify(course);
    expect(wire).not.toContain("dQw4w9WgXcQ");
    expect(wire).not.toContain("secret instructor plan");
    expect(wire).not.toContain("youtubeVideoId");
    expect(wire).not.toContain("recordingFlow");
  });

  test("coming-soon courses show no outline and take a deduplicated, validated waitlist", async () => {
    const t = newTest();
    const owner = await who(t, "o@x.co", "owner");
    const id = await owner.mutation(api.courseAdmin.createCourse, { slug: "mobile", title: "Mobile", type: "focused", description: "soon" });
    const c = (await owner.query(api.courseAdmin.getCourseTree, { courseId: id }))!.course;
    await expect(t.mutation(api.courses.joinWaitlist, { courseId: id, email: "a@x.co" })).rejects.toThrow(/isn't taking a waitlist/);
    await owner.mutation(api.courseAdmin.updateCourse, { courseId: id, slug: c.slug, title: c.title, status: "coming_soon", description: c.description, recommendedOrder: 2 });
    expect((await t.query(api.courses.bySlug, { slug: "mobile" }))!.modules).toEqual([]);
    await expect(t.mutation(api.courses.joinWaitlist, { courseId: id, email: "nope" })).rejects.toThrow(/valid email/);
    await t.mutation(api.courses.joinWaitlist, { courseId: id, email: " A@X.co " });
    await t.mutation(api.courses.joinWaitlist, { courseId: id, email: "a@x.co" });
    expect((await owner.query(api.courseAdmin.getCourseTree, { courseId: id }))!.waitlistCount).toBe(1);
  });

  test("the setup checklist needs sign-in, rejects unknown items and remembers ticks per student", async () => {
    const t = newTest();
    const { slug, courseId } = await published(t);
    await expect(t.mutation(api.courses.toggleSetupItem, { courseId, itemId: "github", done: true })).rejects.toThrow(/sign in/);
    const ada = await who(t, "ada@x.co");
    const bola = await who(t, "bola@x.co");
    await expect(ada.mutation(api.courses.toggleSetupItem, { courseId, itemId: "made-up", done: true })).rejects.toThrow(/doesn't exist/);
    await ada.mutation(api.courses.toggleSetupItem, { courseId, itemId: "github", done: true });
    await ada.mutation(api.courses.toggleSetupItem, { courseId, itemId: "git", done: true });
    await ada.mutation(api.courses.toggleSetupItem, { courseId, itemId: "git", done: false });
    expect((await ada.query(api.courses.setupGuide, { slug }))!.doneIds).toEqual(["github"]);
    expect((await bola.query(api.courses.setupGuide, { slug }))!.doneIds).toEqual([]);
    expect((await t.query(api.courses.setupGuide, { slug }))!.doneIds).toEqual([]);
  });
});

import { formatChapters, formatResources, parseChapters, parseResources } from "../admin-app/src/lib/lessonText";

describe("lesson form text helpers", () => {
  test("chapters round-trip and bad lines explain themselves", () => {
    const parsed = parseChapters("0:00 Intro\n12:30 Build the form\n1:02:03 Wrap up\n90 Seconds only");
    expect(parsed.map((c) => c.startSec)).toEqual([0, 750, 3723, 90]);
    expect(formatChapters(parsed.slice(0, 3))).toBe("0:00 Intro\n12:30 Build the form\n1:02:03 Wrap up");
    expect(() => parseChapters("Intro without a time")).toThrow(/12:30 Chapter title/);
    expect(() => parseChapters("5:99 Bad")).toThrow(/isn't valid/);
  });
  test("resources round-trip", () => {
    const r = parseResources("Glossary | https://example.com/a.pdf\nWorksheet | https://example.com/b?x=1");
    expect(r[1]).toEqual({ title: "Worksheet", url: "https://example.com/b?x=1" });
    expect(formatResources([r[0]])).toBe("Glossary | https://example.com/a.pdf");
    expect(() => parseResources("no separator")).toThrow(/Title \| https/);
  });
});
