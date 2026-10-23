import { ConvexError, v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { OWNER_ONLY, logAudit, requireRole } from "./permissions";
import { GatewayError, streamChat } from "./aiGateway";
import { PROVIDERS, baseUrlFor, dayKey, keyConfigured, loadAiSettings, monthKey, saveAiSettings, validateAiSettings } from "./aiSettings";
import type { AiSettings } from "./aiSettings";

/** Owner-only "AI settings" screen. Never returns or accepts an API key. */

const providerValidator = v.union(...PROVIDERS.map((p) => v.literal(p)));

export const getAiSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, OWNER_ONLY);
    const settings = await loadAiSettings(ctx);
    return {
      settings,
      // Only whether a key exists, never the key. Names tell the owner which Convex variable to set.
      keys: {
        requesty: keyConfigured("requesty"),
        anthropic: keyConfigured("anthropic"),
        custom: keyConfigured("custom") && !!baseUrlFor("custom"),
      },
    };
  },
});

export const saveSettings = mutation({
  args: {
    enabled: v.boolean(),
    provider: providerValidator,
    modelChat: v.string(),
    modelFallback: v.string(),
    modelGrading: v.string(),
    dailyFree: v.number(),
    dailyPro: v.number(),
    monthlyTokenCap: v.number(),
    priceInPerM: v.number(),
    priceOutPerM: v.number(),
    maxOutputTokens: v.number(),
  },
  handler: async (ctx, a) => {
    const { userId } = await requireRole(ctx, OWNER_ONLY);
    const next: AiSettings = { ...a, modelChat: a.modelChat.trim(), modelFallback: a.modelFallback.trim(), modelGrading: a.modelGrading.trim() };
    const problem = validateAiSettings(next);
    if (problem) throw new ConvexError(problem);
    const before = await loadAiSettings(ctx);
    await saveAiSettings(ctx, next);
    await logAudit(ctx, {
      actorId: userId, action: "ai.settings_saved",
      detail: `enabled=${next.enabled} provider=${before.provider}->${next.provider} chat=${before.modelChat}->${next.modelChat}`,
    });
    return null;
  },
});

export const usageSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, OWNER_ONLY);
    const s = await loadAiSettings(ctx);
    const today = await ctx.db.query("aiUsage").withIndex("by_day", (q) => q.eq("day", dayKey(Date.now()))).take(2000);
    const month = await ctx.db.query("aiMonth").withIndex("by_month", (q) => q.eq("month", monthKey(Date.now()))).first();
    const sum = (rows: { messages: number; tokensIn: number; tokensOut: number; costUsd: number }[]) =>
      rows.reduce((t, r) => ({ messages: t.messages + r.messages, tokensIn: t.tokensIn + r.tokensIn, tokensOut: t.tokensOut + r.tokensOut, costUsd: t.costUsd + r.costUsd }), { messages: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 });
    const m = month ?? { messages: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 };
    const used = m.tokensIn + m.tokensOut;
    const pct = s.monthlyTokenCap > 0 ? Math.round((used / s.monthlyTokenCap) * 100) : null;
    return {
      today: { ...sum(today), students: today.length },
      month: { messages: m.messages, tokensIn: m.tokensIn, tokensOut: m.tokensOut, costUsd: m.costUsd },
      capPct: pct,
      // 70% / 90% warnings shown on the screen; at 100% Kody switches to "temporarily limited".
      capState: pct === null ? "none" : pct >= 100 ? "limited" : pct >= 90 ? "critical" : pct >= 70 ? "warning" : "ok",
    };
  },
});

export const ownerSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, OWNER_ONLY);
    return await loadAiSettings(ctx);
  },
});

/** Sends one tiny message to the chosen provider and model so the owner can check the key and model ID. */
export const testConnection = action({
  args: { target: v.union(v.literal("chat"), v.literal("fallback")) },
  handler: async (ctx, { target }): Promise<{ ok: boolean; message: string; sample?: string }> => {
    const s: AiSettings = await ctx.runQuery(internal.aiAdmin.ownerSettings, {});
    const model = target === "chat" ? s.modelChat : s.modelFallback;
    if (!model) return { ok: false as const, message: target === "chat" ? "Set a chat model first." : "No fallback model is set." };
    if (!keyConfigured(s.provider)) {
      const name = s.provider === "requesty" ? "REQUESTY_API_KEY" : s.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "AI_API_KEY (and AI_BASE_URL)";
      return { ok: false as const, message: `No key found. Add ${name} in the Convex dashboard (Settings → Environment Variables).` };
    }
    const started = Date.now();
    try {
      const r = await streamChat({ provider: s.provider, model, system: "Reply with the single word OK.", messages: [{ role: "user", content: "Ping" }], maxTokens: 20, onDelta: () => undefined });
      return { ok: true as const, message: `Worked. ${s.provider} / ${model} answered in ${Date.now() - started} ms.`, sample: r.text.slice(0, 40) };
    } catch (e) {
      return { ok: false as const, message: e instanceof GatewayError ? e.message : "The test failed." };
    }
  },
});
