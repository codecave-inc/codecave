import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { currentUser, hasPro, lessonAccess } from "./entitlements";
import { getStaffProfile } from "./permissions";
import { rateLimiter } from "./rateLimits";
import { fail, cleanText } from "./validation";
import { GatewayError, streamChat } from "./aiGateway";
import { costOf, dayKey, keyConfigured, loadAiSettings, monthKey } from "./aiSettings";
import { KODY_SYSTEM, MAX_INPUT_CHARS, QUICK_KINDS, buildContext, displayText, modelUserText, normalizeHistory } from "./kodyPrompt";

/**
 * Kody, the AI learning partner.
 *
 *  send (mutation)      checks access, limits, kill switch; saves the learner's
 *                       message plus an empty "streaming" reply; schedules generate.
 *  generate (action)    builds the context, calls the provider through aiGateway,
 *                       writes the reply into the saved message as it streams
 *                       (the browser just watches the message: no connection to babysit).
 *  thread (query)       the learner's saved history for the lesson + today's allowance.
 */

const kindValidator = v.union(...QUICK_KINDS.map((k) => v.literal(k)));
const STALE_MS = 3 * 60 * 1000; // a reply still "streaming" after this is treated as failed
const FRIENDLY_FAIL = "Sorry, I couldn't answer just now. Please try again in a moment. (This one didn't count toward your daily messages.)";

async function allowanceFor(ctx: Parameters<typeof hasPro>[0], userId: Id<"users">, s: Awaited<ReturnType<typeof loadAiSettings>>) {
  const staff = await getStaffProfile(ctx, userId);
  const pro = !!staff || (await hasPro(ctx, userId));
  const row = await ctx.db.query("aiUsage").withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", dayKey(Date.now()))).first();
  return { pro, limit: pro ? s.dailyPro : s.dailyFree, used: row?.messages ?? 0, row };
}

async function monthRow(ctx: Parameters<typeof hasPro>[0]) {
  return await ctx.db.query("aiMonth").withIndex("by_month", (q) => q.eq("month", monthKey(Date.now()))).first();
}

export const thread = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const userId = await currentUser(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!userId || !lesson) return null;
    const access = await lessonAccess(ctx, userId, lesson);
    if (!access.ok) return null;
    const s = await loadAiSettings(ctx);
    const a = await allowanceFor(ctx, userId, s);
    const month = await monthRow(ctx);
    const capped = s.monthlyTokenCap > 0 && !!month && month.tokensIn + month.tokensOut >= s.monthlyTokenCap;
    const th = await ctx.db.query("aiThreads").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lessonId)).first();
    const rows = th ? await ctx.db.query("aiMessages").withIndex("by_thread", (q) => q.eq("threadId", th._id)).order("desc").take(100) : [];
    const now = Date.now();
    const messages = rows.reverse().map((m) => {
      const stale = m.status === "streaming" && now - m.createdAt > STALE_MS;
      return { _id: m._id, role: m.role, kind: m.kind ?? null, content: stale ? FRIENDLY_FAIL : m.content, status: stale ? ("error" as const) : m.status, createdAt: m.createdAt };
    });
    return {
      messages,
      status: {
        available: s.enabled && keyConfigured(s.provider) && !!s.modelChat && !capped,
        reason: !s.enabled || !keyConfigured(s.provider) || !s.modelChat ? ("off" as const) : capped ? ("limited" as const) : null,
        limit: a.limit, used: a.used, remaining: Math.max(0, a.limit - a.used), pro: a.pro,
      },
    };
  },
});

export const send = mutation({
  args: { lessonId: v.id("lessons"), kind: kindValidator, text: v.string(), positionSec: v.number() },
  handler: async (ctx, a) => {
    const userId = await currentUser(ctx);
    const lesson = await ctx.db.get(a.lessonId);
    if (!userId || !lesson) fail("Please sign in to chat with Kody.");
    const access = await lessonAccess(ctx, userId, lesson);
    if (!access.ok) fail("This lesson isn't available.");

    const s = await loadAiSettings(ctx);
    if (!s.enabled || !keyConfigured(s.provider) || !s.modelChat) fail("Kody is resting right now. Please check back soon.");
    const month = await monthRow(ctx);
    if (s.monthlyTokenCap > 0 && month && month.tokensIn + month.tokensOut >= s.monthlyTokenCap) {
      fail("Kody is temporarily limited while we catch up. Please try again soon. Your lesson notes are still here.");
    }

    const typed = a.kind === "explain" || a.kind === "hint" || a.kind === "quiz" ? "" : cleanText(a.text, "Your message", MAX_INPUT_CHARS);
    if (!typed && a.kind !== "explain" && a.kind !== "hint" && a.kind !== "quiz") fail("Type a message for Kody first.");
    const content = displayText(a.kind, typed);

    const th0 = await ctx.db.query("aiThreads").withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", a.lessonId)).first();
    const now = Date.now();
    if (th0) {
      const latest = await ctx.db.query("aiMessages").withIndex("by_thread", (q) => q.eq("threadId", th0._id)).order("desc").first();
      if (latest && latest.role === "assistant" && latest.status === "streaming" && now - latest.createdAt < STALE_MS) fail("Kody is still answering. Wait for the reply to finish.");
    }

    const allow = await allowanceFor(ctx, userId, s);
    if (allow.used >= allow.limit) {
      fail(allow.pro
        ? `You've used all ${allow.limit} Kody messages for today. They reset tomorrow.`
        : `You've used your ${allow.limit} free Kody messages for today. They reset tomorrow, or upgrade to Pro for more.`);
    }
    const lim = await rateLimiter.limit(ctx, "kodyPerUser", { key: userId });
    if (!lim.ok) fail("You're sending messages quickly. Give Kody a minute and try again.");

    const threadId = th0?._id ?? (await ctx.db.insert("aiThreads", { userId, lessonId: a.lessonId, createdAt: now, updatedAt: now }));
    if (th0) await ctx.db.patch(threadId, { updatedAt: now });
    const position = Number.isFinite(a.positionSec) ? Math.max(0, a.positionSec) : 0;
    await ctx.db.insert("aiMessages", { threadId, userId, lessonId: a.lessonId, role: "user", kind: a.kind, content, status: "done", positionSec: position, createdAt: now });
    const assistantId = await ctx.db.insert("aiMessages", { threadId, userId, lessonId: a.lessonId, role: "assistant", content: "", status: "streaming", createdAt: now + 1 });

    // Count it now (so rapid double-sends can't skip the limit); refunded if the reply fails.
    if (allow.row) await ctx.db.patch(allow.row._id, { messages: allow.row.messages + 1 });
    else await ctx.db.insert("aiUsage", { userId, day: dayKey(now), messages: 1, tokensIn: 0, tokensOut: 0, costUsd: 0 });
    if (month) await ctx.db.patch(month._id, { messages: month.messages + 1 });
    else await ctx.db.insert("aiMonth", { month: monthKey(now), messages: 1, tokensIn: 0, tokensOut: 0, costUsd: 0 });

    await ctx.scheduler.runAfter(0, internal.kody.generate, { assistantId });
    return { remaining: Math.max(0, allow.limit - allow.used - 1) };
  },
});

// ------------------------------------------------------------------ generation

export const loadForGeneration = internalQuery({
  args: { assistantId: v.id("aiMessages") },
  handler: async (ctx, { assistantId }) => {
    const reply = await ctx.db.get(assistantId);
    if (!reply || reply.role !== "assistant" || reply.status !== "streaming") return null;
    const lesson = await ctx.db.get(reply.lessonId);
    if (!lesson) return null;
    const course = await ctx.db.get(lesson.courseId);
    const mod = lesson.moduleId ? await ctx.db.get(lesson.moduleId) : null;
    const settings = await loadAiSettings(ctx);
    const history = await ctx.db.query("aiMessages").withIndex("by_thread", (q) => q.eq("threadId", reply.threadId)).order("desc").take(14);
    const ordered = history.reverse().filter((m) => m._id !== assistantId && m.status === "done");
    const lastUser = [...ordered].reverse().find((m) => m.role === "user");
    const position = lastUser?.positionSec ?? 0;
    const chunks = await ctx.db.query("transcriptChunks").withIndex("by_lessonId", (q) => q.eq("lessonId", lesson._id)).take(1500);
    const notes = await ctx.db.query("notes").withIndex("by_user_lesson", (q) => q.eq("userId", reply.userId).eq("lessonId", lesson._id)).take(20);
    const context = buildContext({
      courseTitle: course?.title ?? "", moduleTitle: mod?.title ?? null, lessonTitle: lesson.title, lessonNumber: lesson.number,
      summary: lesson.summary, objectives: lesson.objectives, keyConcepts: lesson.keyConcepts as string[], chapters: lesson.chapters,
      chunks: chunks.map((c) => ({ startSec: c.startSec, endSec: c.endSec, text: c.text })), positionSec: position, durationSec: lesson.durationSec,
      notes: notes.map((n) => ({ timestampSec: n.timestampSec, body: n.body })),
    });
    const msgs = ordered.map((m, i) => ({
      role: m.role,
      // Only the newest learner message carries the quick-action instruction.
      content: m.role === "user" && m._id === lastUser?._id ? modelUserText((m.kind as (typeof QUICK_KINDS)[number]) ?? "free", m.content) : m.content,
    }));
    return { settings, system: `${KODY_SYSTEM}\n\n${context}`, messages: normalizeHistory(msgs), userId: reply.userId };
  },
});

export const writeProgress = internalMutation({
  args: { id: v.id("aiMessages"), content: v.string() },
  handler: async (ctx, { id, content }) => {
    const m = await ctx.db.get(id);
    if (m && m.status === "streaming") await ctx.db.patch(id, { content });
  },
});

export const finish = internalMutation({
  args: { id: v.id("aiMessages"), content: v.string(), provider: v.string(), model: v.string(), tokensIn: v.number(), tokensOut: v.number() },
  handler: async (ctx, a) => {
    const m = await ctx.db.get(a.id);
    if (!m || m.status !== "streaming") return;
    const s = await loadAiSettings(ctx);
    const cost = costOf(s, a.tokensIn, a.tokensOut);
    await ctx.db.patch(a.id, { content: a.content, status: "done", provider: a.provider, model: a.model, tokensIn: a.tokensIn, tokensOut: a.tokensOut, costUsd: cost });
    const day = await ctx.db.query("aiUsage").withIndex("by_user_day", (q) => q.eq("userId", m.userId).eq("day", dayKey(m.createdAt))).first();
    if (day) await ctx.db.patch(day._id, { tokensIn: day.tokensIn + a.tokensIn, tokensOut: day.tokensOut + a.tokensOut, costUsd: day.costUsd + cost });
    const mo = await ctx.db.query("aiMonth").withIndex("by_month", (q) => q.eq("month", monthKey(m.createdAt))).first();
    if (mo) await ctx.db.patch(mo._id, { tokensIn: mo.tokensIn + a.tokensIn, tokensOut: mo.tokensOut + a.tokensOut, costUsd: mo.costUsd + cost });
  },
});

export const failReply = internalMutation({
  args: { id: v.id("aiMessages"), keepText: v.boolean() },
  handler: async (ctx, { id, keepText }) => {
    const m = await ctx.db.get(id);
    if (!m || m.status !== "streaming") return;
    await ctx.db.patch(id, { status: "error", content: keepText && m.content ? `${m.content}\n\n_(The reply was cut off. Please ask again.)_` : FRIENDLY_FAIL });
    // A failed reply doesn't cost the learner a message.
    const day = await ctx.db.query("aiUsage").withIndex("by_user_day", (q) => q.eq("userId", m.userId).eq("day", dayKey(m.createdAt))).first();
    if (day && day.messages > 0) await ctx.db.patch(day._id, { messages: day.messages - 1 });
    const mo = await ctx.db.query("aiMonth").withIndex("by_month", (q) => q.eq("month", monthKey(m.createdAt))).first();
    if (mo && mo.messages > 0) await ctx.db.patch(mo._id, { messages: mo.messages - 1 });
  },
});

const retryable = (e: unknown) => e instanceof GatewayError && !e.gotOutput && (e.status === 0 || e.status === 429 || e.status >= 500);

export const generate = internalAction({
  args: { assistantId: v.id("aiMessages") },
  handler: async (ctx, { assistantId }) => {
    const job = await ctx.runQuery(internal.kody.loadForGeneration, { assistantId });
    if (!job) return;
    const { settings: s, system, messages } = job;
    if (messages.length === 0) { await ctx.runMutation(internal.kody.failReply, { id: assistantId, keepText: false }); return; }

    // Try the chat model; on a provider failure try the fallback model (or the same model once more).
    const models = [s.modelChat, s.modelFallback && s.modelFallback !== s.modelChat ? s.modelFallback : s.modelChat];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < models.length; attempt++) {
      const model = models[attempt];
      let buffer = "";
      let flushedAt = 0;
      let writing: Promise<unknown> = Promise.resolve();
      const flush = (force: boolean) => {
        const now = Date.now();
        if (!force && now - flushedAt < 350) return;
        flushedAt = now;
        const snapshot = buffer;
        writing = writing.then(() => ctx.runMutation(internal.kody.writeProgress, { id: assistantId, content: snapshot })).catch(() => undefined);
      };
      try {
        const r = await streamChat({
          provider: s.provider, model, system, messages, maxTokens: s.maxOutputTokens,
          onDelta: (t) => { buffer += t; flush(false); },
        });
        await writing;
        await ctx.runMutation(internal.kody.finish, { id: assistantId, content: r.text, provider: s.provider, model, tokensIn: r.tokensIn, tokensOut: r.tokensOut });
        return;
      } catch (e) {
        lastErr = e;
        if (e instanceof GatewayError && e.gotOutput) flush(true); // keep what was streamed before the cut
        await writing;
        console.error(`Kody: attempt ${attempt + 1} with ${s.provider}/${model} failed:`, e instanceof Error ? e.message : e);
        if (!retryable(e) || attempt === models.length - 1) break;
        if (buffer) { buffer = ""; flush(true); await writing; }
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    await ctx.runMutation(internal.kody.failReply, { id: assistantId, keepText: lastErr instanceof GatewayError && lastErr.gotOutput });
  },
});
