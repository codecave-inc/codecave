import { v } from "convex/values";
import { cleanOptionalText, cleanText, fail } from "./validation";

/** Validators and cleaners shared by the admin course functions. */

export const courseStatus = v.union(v.literal("draft"), v.literal("published"), v.literal("coming_soon"));
export const courseType = v.union(v.literal("focused"), v.literal("utility"));

export const lessonContent = v.object({
  title: v.string(),
  status: courseStatus,
  isFreePreview: v.boolean(),
  summary: v.string(),
  youtubeVideoId: v.optional(v.string()),
  durationMin: v.number(),
  objectives: v.array(v.string()),
  keyConcepts: v.array(v.string()),
  notesMd: v.string(),
  promptCards: v.array(v.object({ title: v.string(), prompt: v.string() })),
  taskMd: v.string(),
  pitfalls: v.array(v.string()),
  chapters: v.array(v.object({ startSec: v.number(), title: v.string() })),
  tools: v.array(v.string()),
  studentOutput: v.string(),
  evidenceMd: v.string(),
  assetsNote: v.string(),
  resources: v.array(v.object({ title: v.string(), url: v.string() })),
  recordingFlow: v.array(v.string()),
  verified: v.optional(v.boolean()),
});

export function cleanSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    fail("The web address name can only use lowercase letters, numbers and single dashes (for example ai-website-development).");
  }
  return slug;
}

/** Accepts a bare 11-character id or any common YouTube URL. */
export function cleanYoutubeId(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim();
  if (t === "") return undefined;
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/live\/|\/shorts\/)([A-Za-z0-9_-]{11})/.exec(t);
  if (!m) fail("That doesn't look like a YouTube video link or ID.");
  return m[1];
}

function list(items: string[], label: string, maxItems: number, maxLen: number): string[] {
  if (items.length > maxItems) fail(`${label}: too many items (maximum ${maxItems}).`);
  return items.map((s) => s.trim()).filter((s) => s.length > 0).map((s) => cleanText(s, label, maxLen));
}

function cleanUrl(raw: string, label: string): string {
  const t = raw.trim();
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return fail(`${label}: please enter a full link starting with https://`);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") fail(`${label}: only web links are allowed.`);
  return t.slice(0, 500);
}

export function cleanLesson(c: {
  title: string; summary: string; durationMin: number; objectives: string[]; keyConcepts: string[]; notesMd: string;
  promptCards: { title: string; prompt: string }[]; taskMd: string; pitfalls: string[]; chapters: { startSec: number; title: string }[];
  tools: string[]; studentOutput: string; evidenceMd: string; assetsNote: string; resources: { title: string; url: string }[];
  recordingFlow: string[]; youtubeVideoId?: string;
}) {
  if (!Number.isFinite(c.durationMin) || c.durationMin < 0 || c.durationMin > 600) fail("Duration must be between 0 and 600 minutes.");
  if (c.promptCards.length > 10) fail("Prompt cards: too many (maximum 10).");
  if (c.chapters.length > 60) fail("Chapters: too many (maximum 60).");
  if (c.resources.length > 30) fail("Resources: too many (maximum 30).");
  return {
    title: cleanText(c.title, "Lesson title", 160),
    summary: cleanOptionalText(c.summary, "Summary", 1500) ?? "",
    youtubeVideoId: cleanYoutubeId(c.youtubeVideoId),
    durationSec: Math.round(c.durationMin * 60),
    objectives: list(c.objectives, "Objectives", 20, 400),
    keyConcepts: list(c.keyConcepts, "Key concepts", 30, 200),
    notesMd: cleanOptionalText(c.notesMd, "Lesson notes", 30000) ?? "",
    promptCards: c.promptCards.map((p) => ({ title: cleanText(p.title, "Prompt title", 120), prompt: cleanText(p.prompt, "Prompt", 4000) })),
    taskMd: cleanOptionalText(c.taskMd, "Task", 6000) ?? "",
    pitfalls: list(c.pitfalls, "Pitfalls", 20, 400),
    chapters: c.chapters.map((ch) => {
      if (!Number.isInteger(ch.startSec) || ch.startSec < 0 || ch.startSec > 36000) fail("Chapter times must be whole seconds.");
      return { startSec: ch.startSec, title: cleanText(ch.title, "Chapter title", 160) };
    }).sort((a, b) => a.startSec - b.startSec),
    tools: list(c.tools, "Tools", 20, 80),
    studentOutput: cleanOptionalText(c.studentOutput, "Student output", 1500) ?? "",
    evidenceMd: cleanOptionalText(c.evidenceMd, "Evidence", 3000) ?? "",
    assetsNote: cleanOptionalText(c.assetsNote, "Downloads note", 1500) ?? "",
    resources: c.resources.map((r) => ({ title: cleanText(r.title, "Resource title", 160), url: cleanUrl(r.url, "Resource link") })),
    recordingFlow: list(c.recordingFlow, "Recording flow", 30, 400),
  };
}
