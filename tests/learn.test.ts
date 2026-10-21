/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { newTest } from "./testSetup";
import { addSegment, effectiveVideoSec, mergeRanges, percent, totalSeconds } from "../convex/progressMath";

type T = ReturnType<typeof newTest>;

async function who(t: T, email: string, role?: "owner" | "editor" | "instructor" | "moderator", name = "Ada Obi") {
  const id = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name, emailVerificationTime: Date.now() });
    if (role) await ctx.db.insert("adminProfiles", { userId, role, addedAt: Date.now() });
    else await ctx.db.insert("profiles", { userId, createdAt: Date.now(), signupCompletedAt: Date.now() });
    return userId;
  });
  return t.withIdentity({ subject: id });
}

const body = (over: Record<string, unknown> = {}) => ({
  title: "L", status: "published" as const, isFreePreview: false, summary: "s", durationMin: 10, objectives: ["o"], keyConcepts: [],
  notesMd: "secret-notes-body", promptCards: [], taskMd: "", pitfalls: [], chapters: [], tools: [], studentOutput: "", evidenceMd: "",
  assetsNote: "", resources: [], recordingFlow: [], youtubeVideoId: "dQw4w9WgXcQ", ...over,
});

/** A published course with lesson 1 (free) and lesson 2 (Pro), 10 minutes each; lesson 3 stays a draft. */
async function seed(t: T) {
  const owner = await who(t, "owner@x.co", "owner", "Wisdom Arimie");
  const { courseId } = await owner.mutation(api.courseAdmin.importWebDevOutline, {});
  const tree = (await owner.query(api.courseAdmin.getCourseTree, { courseId }))!;
  const c = tree.course;
  await owner.mutation(api.courseAdmin.updateCourse, { courseId, slug: c.slug, title: c.title, status: "published", description: c.description, recommendedOrder: 1, setupGuide: c.setupGuide });
  const by = (n: number) => tree.lessons.find((l) => l.number === n)!._id;
  await owner.mutation(api.courseAdmin.updateLesson, { lessonId: by(1), content: body({ isFreePreview: true }) });
  await owner.mutation(api.courseAdmin.updateLesson, { lessonId: by(2), content: body({ title: "Pro lesson" }) });
  return { owner, courseId, free: by(1), pro: by(2), draft: by(3) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("progress arithmetic", () => {
  test("ranges merge, overlap counts once, and tiny gaps are bridged", () => {
    const m = mergeRanges([{ start: 10, end: 20 }, { start: 0, end: 5 }, { start: 15, end: 30 }, { start: 31, end: 33 }]);
    expect(m).toEqual([{ start: 0, end: 5 }, { start: 10, end: 33 }]);
    expect(totalSeconds(m)).toBe(28);
  });
  test("a huge segment is capped by elapsed time, so a lesson can't be 'watched' in one call", () => {
    expect(totalSeconds(addSegment([], { start: 0, end: 600 }, { videoSec: 600, elapsedSec: 5 }))).toBeCloseTo(17.25);
    expect(totalSeconds(addSegment([], { start: 0, end: 600 }, { videoSec: 600, elapsedSec: null }))).toBe(15);
    expect(totalSeconds(addSegment([], { start: 0, end: 600 }, { videoSec: 600, elapsedSec: 99999 }))).toBe(60);
  });
  test("segments are clamped to the video and negative or empty ones ignored", () => {
    expect(totalSeconds(addSegment([], { start: 590, end: 700 }, { videoSec: 600, elapsedSec: 60 }))).toBe(10);
    expect(addSegment([], { start: 5, end: 5 }, { videoSec: 600, elapsedSec: 60 })).toEqual([]);
  });
  test("percent and player-duration trust", () => {
    expect(percent(540, 600)).toBe(90);
    expect(percent(700, 600)).toBe(100);
    expect(effectiveVideoSec(600, 570)).toBe(570);
    expect(effectiveVideoSec(600, 60)).toBe(600); // wildly different: don't trust
    expect(effectiveVideoSec(600, undefined)).toBe(600);
    expect(effectiveVideoSec(0, 300)).toBe(300);
  });
});

describe("lesson access", () => {
  test("signed out sees nothing; free lesson opens; Pro lesson is a teaser with no content or video", async () => {
    const t = newTest();
    const { free, pro } = await seed(t);
    expect(await t.query(api.learn.lesson, { lessonId: free })).toBeNull();
    const ada = await who(t, "ada@x.co");
    const f = (await ada.query(api.learn.lesson, { lessonId: free }))!;
    expect(f.access.ok).toBe(true);
    expect(f.content!.hasVideo).toBe(true);
    const p = (await ada.query(api.learn.lesson, { lessonId: pro }))!;
    expect(p.access).toEqual({ ok: false, reason: "pro_required" });
    expect(p.content).toBeNull();
    const wire = JSON.stringify(p) + JSON.stringify(f);
    expect(wire).not.toContain("dQw4w9WgXcQ");
    expect(wire).not.toContain("recordingFlow");
    expect(JSON.stringify(p)).not.toContain("secret-notes-body");
    await expect(ada.mutation(api.learn.requestVideo, { lessonId: pro })).rejects.toThrow(/part of Pro/);
    expect(await ada.query(api.learn.transcript, { lessonId: pro })).toEqual([]);
  });

  test("the openAccess setting unlocks published Pro lessons for testing", async () => {
    const t = newTest();
    const { owner, pro } = await seed(t);
    await t.run((ctx) => ctx.db.insert("siteSettings", { key: "private.openAccess", value: "true" }));
    void owner;
    const ada = await who(t, "ada@x.co");
    expect((await ada.query(api.learn.lesson, { lessonId: pro }))!.access.ok).toBe(true);
  });

  test("drafts are invisible to students but previewable by content staff", async () => {
    const t = newTest();
    const { draft } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const ins = await who(t, "ins@x.co", "instructor");
    const mod = await who(t, "mod@x.co", "moderator");
    expect(await ada.query(api.learn.lesson, { lessonId: draft })).toBeNull();
    expect((await ins.query(api.learn.lesson, { lessonId: draft }))!.access).toMatchObject({ ok: true, staffPreview: true });
    expect(await mod.query(api.learn.lesson, { lessonId: draft })).toBeNull();
    await expect(ada.mutation(api.learn.requestVideo, { lessonId: draft })).rejects.toThrow(/isn't available/);
  });

  test("the video id is released to an eligible student, logged, and rate limited", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const r = await ada.mutation(api.learn.requestVideo, { lessonId: free });
    expect(r).toEqual({ videoId: "dQw4w9WgXcQ", resumeSec: 0 });
    expect(await t.run((ctx) => ctx.db.query("videoRequests").collect())).toHaveLength(1);
    let blocked = false;
    for (let i = 0; i < 40 && !blocked; i++) {
      try { await ada.mutation(api.learn.requestVideo, { lessonId: free }); } catch (e) { blocked = /opening a lot of videos/.test(String(e)); }
    }
    expect(blocked).toBe(true);
  });

  test("navigation lists only published neighbours", async () => {
    const t = newTest();
    const { free, pro } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const f = (await ada.query(api.learn.lesson, { lessonId: free }))!;
    expect(f.nav.prev).toBeNull();
    expect(f.nav.next!._id).toBe(pro);
    const p = (await ada.query(api.learn.lesson, { lessonId: pro }))!;
    expect(p.nav.next).toBeNull(); // lesson 3 is still a draft
  });
});

describe("saving progress", () => {
  test("counts unique seconds, ignores replays, resumes, enrolls, and marks complete at 90%", async () => {
    const t = newTest();
    const { free, courseId } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const save = (segment: { start: number; end: number } | undefined, positionSec: number) =>
      ada.mutation(api.learn.saveProgress, { lessonId: free, segment, positionSec });
    // 10-minute lesson = 600s. Watch in real time, 15s at a time.
    let pos = 0;
    let r = await save({ start: 0, end: 10 }, 10);
    pos = 10;
    expect(r.watchedPct).toBeCloseTo(1.7, 1);
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(10_000);
      r = await save({ start: pos, end: pos + 10 }, pos + 10);
      pos += 10;
    }
    expect(r.watchedPct).toBeCloseTo(18.3, 1);
    // replay the same minute five times: no change
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(10_000);
      r = await save({ start: 0, end: 10 }, 10);
    }
    expect(r.watchedPct).toBeCloseTo(18.3, 1);
    expect(r.videoComplete).toBe(false);
    // resume position after leaving
    await save(undefined, 123);
    expect((await ada.mutation(api.learn.requestVideo, { lessonId: free })).resumeSec).toBe(120);
    // finish
    for (pos = 110; pos < 560; pos += 10) {
      vi.advanceTimersByTime(10_000);
      r = await save({ start: pos, end: pos + 10 }, pos + 10);
    }
    expect(r.videoComplete).toBe(true);
    expect(r.watchedPct).toBeGreaterThanOrEqual(90);
    // staying complete, and a finished lesson restarts from the beginning
    await save(undefined, 5);
    expect((await ada.mutation(api.learn.requestVideo, { lessonId: free })).resumeSec).toBe(0);
    expect((await ada.query(api.learn.courseProgress, { courseId }))[free]).toMatchObject({ complete: true });
    expect(await t.run((ctx) => ctx.db.query("enrollments").collect())).toHaveLength(1);
    expect(await ada.query(api.learn.continueLearning, {})).toMatchObject({ lessonId: free, complete: true });
  });

  test("one giant segment can't complete a lesson, and progress is per student", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const bola = await who(t, "bola@x.co");
    const r = await ada.mutation(api.learn.saveProgress, { lessonId: free, segment: { start: 0, end: 600 }, positionSec: 600 });
    expect(r.videoComplete).toBe(false);
    expect(r.watchedPct).toBeLessThan(5);
    const l = (await bola.query(api.learn.lesson, { lessonId: free }))!;
    expect(l.progress).toBeNull();
  });

  test("the player's own duration is trusted when the typed one is slightly off", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co");
    // typed 600s, real video 540s: 90% = 486s
    let r = await ada.mutation(api.learn.saveProgress, { lessonId: free, segment: { start: 0, end: 10 }, positionSec: 10, playerDurationSec: 540 });
    let pos = 10;
    while (pos < 500) {
      vi.advanceTimersByTime(10_000);
      r = await ada.mutation(api.learn.saveProgress, { lessonId: free, segment: { start: pos, end: pos + 10 }, positionSec: pos + 10, playerDurationSec: 540 });
      pos += 10;
    }
    expect(r.videoComplete).toBe(true);
  });

  test("signed-out and ineligible callers can't save", async () => {
    const t = newTest();
    const { free, pro } = await seed(t);
    const ada = await who(t, "ada@x.co");
    await expect(t.mutation(api.learn.saveProgress, { lessonId: free, positionSec: 1 })).rejects.toThrow(/sign in/);
    await expect(ada.mutation(api.learn.saveProgress, { lessonId: pro, positionSec: 1 })).rejects.toThrow(/isn't available/);
  });
});

describe("notes and ratings", () => {
  test("notes are private, editable only by the owner, and ordered by time", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const bola = await who(t, "bola@x.co");
    const n2 = await ada.mutation(api.engagement.addNote, { lessonId: free, timestampSec: 90.7, body: "second" });
    await ada.mutation(api.engagement.addNote, { lessonId: free, timestampSec: 5, body: "first" });
    expect((await ada.query(api.engagement.listNotes, { lessonId: free })).map((n) => [n.timestampSec, n.body])).toEqual([[5, "first"], [90, "second"]]);
    expect(await bola.query(api.engagement.listNotes, { lessonId: free })).toEqual([]);
    await expect(bola.mutation(api.engagement.updateNote, { noteId: n2, body: "hijack" })).rejects.toThrow(/doesn't exist/);
    await expect(bola.mutation(api.engagement.deleteNote, { noteId: n2 })).rejects.toThrow(/doesn't exist/);
    await ada.mutation(api.engagement.updateNote, { noteId: n2, body: "edited" });
    await ada.mutation(api.engagement.deleteNote, { noteId: n2 });
    expect(await ada.query(api.engagement.listNotes, { lessonId: free })).toHaveLength(1);
    await expect(ada.mutation(api.engagement.addNote, { lessonId: free, timestampSec: 5, body: "   " })).rejects.toThrow(/required/);
    await expect(ada.mutation(api.engagement.addNote, { lessonId: free, timestampSec: -3, body: "x" })).rejects.toThrow(/isn't valid/);
  });

  test("one rating per student, editable, 1 to 5 only", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co");
    await ada.mutation(api.engagement.rate, { lessonId: free, stars: 4, feedback: "Clear" });
    await ada.mutation(api.engagement.rate, { lessonId: free, stars: 5 });
    expect(await ada.query(api.engagement.myRating, { lessonId: free })).toEqual({ stars: 5, feedback: "" });
    expect(await t.run((ctx) => ctx.db.query("ratings").collect())).toHaveLength(1);
    await expect(ada.mutation(api.engagement.rate, { lessonId: free, stars: 6 })).rejects.toThrow(/1 to 5/);
    await expect(ada.mutation(api.engagement.rate, { lessonId: free, stars: 2.5 })).rejects.toThrow(/1 to 5/);
  });
});

describe("comments and moderation", () => {
  test("one level of replies; names are shortened; staff are marked", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co", undefined, "Ada Chinwe Obi");
    const ins = await who(t, "ins@x.co", "instructor", "Wisdom Arimie");
    await ada.mutation(api.engagement.addComment, { lessonId: free, body: "Question?" });
    const top = (await ada.query(api.engagement.listComments, { lessonId: free }))[0];
    await ins.mutation(api.engagement.addComment, { lessonId: free, body: "Answer.", parentId: top._id });
    const after = (await ada.query(api.engagement.listComments, { lessonId: free }))[0];
    expect(after.author).toBe("Ada O.");
    expect(after.mine).toBe(true);
    expect(after.replies).toHaveLength(1);
    expect(after.replies[0]).toMatchObject({ author: "Wisdom A.", isStaff: true, mine: false });
    await expect(ada.mutation(api.engagement.addComment, { lessonId: free, body: "deeper", parentId: after.replies[0]._id })).rejects.toThrow(/top-level/);
    expect(JSON.stringify(after)).not.toContain("ada@x.co");
  });

  test("report → moderator queue → hide removes it; students can't moderate; own comments can't be reported", async () => {
    const t = newTest();
    const { free } = await seed(t);
    const ada = await who(t, "ada@x.co");
    const bola = await who(t, "bola@x.co");
    const mod = await who(t, "mod@x.co", "moderator");
    await ada.mutation(api.engagement.addComment, { lessonId: free, body: "rude words" });
    const id = (await bola.query(api.engagement.listComments, { lessonId: free }))[0]._id;
    await expect(ada.mutation(api.engagement.reportComment, { commentId: id })).rejects.toThrow(/own comment/);
    await bola.mutation(api.engagement.reportComment, { commentId: id });
    await bola.mutation(api.engagement.reportComment, { commentId: id }); // twice: counted once
    await expect(bola.query(api.commentAdmin.listQueue, {})).rejects.toThrow(/admin access/);
    await expect(bola.mutation(api.commentAdmin.setStatus, { commentId: id, status: "hidden" })).rejects.toThrow(/admin access/);
    const q = await mod.query(api.commentAdmin.listQueue, {});
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ body: "rude words", reportCount: 1, authorEmail: "ada@x.co" });
    await mod.mutation(api.commentAdmin.setStatus, { commentId: id, status: "hidden" });
    expect(await bola.query(api.engagement.listComments, { lessonId: free })).toEqual([]);
    expect(await mod.query(api.commentAdmin.listQueue, {})).toEqual([]);
  });

  test("comments need lesson access and are rate limited", async () => {
    const t = newTest();
    const { free, pro } = await seed(t);
    const ada = await who(t, "ada@x.co");
    await expect(ada.mutation(api.engagement.addComment, { lessonId: pro, body: "hi" })).rejects.toThrow(/isn't available/);
    expect(await ada.query(api.engagement.listComments, { lessonId: pro })).toEqual([]);
    let blocked = false;
    for (let i = 0; i < 12 && !blocked; i++) {
      try { await ada.mutation(api.engagement.addComment, { lessonId: free, body: `c${i}` }); } catch (e) { blocked = /commenting very quickly/.test(String(e)); }
    }
    expect(blocked).toBe(true);
  });
});

void (null as unknown as Id<"lessons">);
