import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Kody's non-secret settings. They live in siteSettings under `private.ai.*`
 * (hidden from the public site) and are edited on the owner-only "AI settings"
 * screen. API keys are NOT here: they live in Convex environment variables
 * (REQUESTY_API_KEY, ANTHROPIC_API_KEY, AI_API_KEY) and are never sent to a browser.
 */

export const PROVIDERS = ["requesty", "anthropic", "custom"] as const;
export type Provider = (typeof PROVIDERS)[number];

export type AiSettings = {
  enabled: boolean; // kill switch
  provider: Provider;
  modelChat: string;
  modelFallback: string; // optional, "" = none
  modelGrading: string; // used from Phase 5
  dailyFree: number;
  dailyPro: number;
  monthlyTokenCap: number; // 0 = no cap
  priceInPerM: number; // USD per million input tokens (for the cost log), 0 = unknown
  priceOutPerM: number;
  maxOutputTokens: number;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  provider: "requesty",
  modelChat: "",
  modelFallback: "",
  modelGrading: "",
  dailyFree: 10,
  dailyPro: 100,
  monthlyTokenCap: 0,
  priceInPerM: 0,
  priceOutPerM: 0,
  maxOutputTokens: 700,
};

const KEY = (name: keyof AiSettings) => `private.ai.${name}`;
export const AI_KEYS = (Object.keys(DEFAULT_AI_SETTINGS) as (keyof AiSettings)[]).map(KEY);

const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:\/@+-]{0,119}$/;

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function loadAiSettings(ctx: QueryCtx | MutationCtx): Promise<AiSettings> {
  const rows = await ctx.db.query("siteSettings").collect();
  const m = new Map(rows.filter((r) => r.key.startsWith("private.ai.")).map((r) => [r.key, r.value]));
  const d = DEFAULT_AI_SETTINGS;
  const provider = m.get(KEY("provider")) as Provider | undefined;
  return {
    enabled: m.get(KEY("enabled")) !== "false",
    provider: provider && (PROVIDERS as readonly string[]).includes(provider) ? provider : d.provider,
    // Settings win; the CHAT_MODEL / GRADING_MODEL env vars from the PRD are the fallback.
    modelChat: m.get(KEY("modelChat")) || process.env.CHAT_MODEL || d.modelChat,
    modelFallback: m.get(KEY("modelFallback")) ?? d.modelFallback,
    modelGrading: m.get(KEY("modelGrading")) || process.env.GRADING_MODEL || d.modelGrading,
    dailyFree: Math.floor(num(m.get(KEY("dailyFree")), d.dailyFree)),
    dailyPro: Math.floor(num(m.get(KEY("dailyPro")), d.dailyPro)),
    monthlyTokenCap: Math.floor(num(m.get(KEY("monthlyTokenCap")), d.monthlyTokenCap)),
    priceInPerM: num(m.get(KEY("priceInPerM")), d.priceInPerM),
    priceOutPerM: num(m.get(KEY("priceOutPerM")), d.priceOutPerM),
    maxOutputTokens: Math.max(100, Math.min(4000, Math.floor(num(m.get(KEY("maxOutputTokens")), d.maxOutputTokens)))),
  };
}

/** Validates what the owner typed. Returns an error sentence, or null if fine. */
export function validateAiSettings(s: AiSettings): string | null {
  if (!(PROVIDERS as readonly string[]).includes(s.provider)) return "Unknown provider.";
  for (const [label, val, required] of [["Chat model", s.modelChat, true], ["Fallback model", s.modelFallback, false], ["Grading model", s.modelGrading, false]] as const) {
    if (!val && !required) continue;
    if (!val) return `${label} is required.`;
    if (!MODEL_RE.test(val)) return `${label} doesn't look like a model ID (letters, numbers and . _ : / - only).`;
  }
  for (const [label, val, max] of [["Free daily limit", s.dailyFree, 1000], ["Pro daily limit", s.dailyPro, 5000]] as const) {
    if (!Number.isInteger(val) || val < 0 || val > max) return `${label} must be a whole number from 0 to ${max}.`;
  }
  if (!Number.isInteger(s.monthlyTokenCap) || s.monthlyTokenCap < 0) return "Monthly token cap must be 0 (no cap) or a positive whole number.";
  if (!(s.priceInPerM >= 0 && s.priceInPerM <= 1000) || !(s.priceOutPerM >= 0 && s.priceOutPerM <= 1000)) return "Prices must be between 0 and 1000 USD per million tokens.";
  if (!Number.isInteger(s.maxOutputTokens) || s.maxOutputTokens < 100 || s.maxOutputTokens > 4000) return "Max reply length must be 100 to 4000 tokens.";
  return null;
}

export async function saveAiSettings(ctx: MutationCtx, s: AiSettings) {
  for (const name of Object.keys(DEFAULT_AI_SETTINGS) as (keyof AiSettings)[]) {
    const value = String(s[name]);
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", KEY(name))).first();
    if (row) { if (row.value !== value) await ctx.db.patch(row._id, { value }); }
    else await ctx.db.insert("siteSettings", { key: KEY(name), value });
  }
}

export function keyConfigured(provider: Provider): boolean {
  return !!apiKeyFor(provider);
}

export function apiKeyFor(provider: Provider): string | undefined {
  const k = provider === "requesty" ? process.env.REQUESTY_API_KEY : provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.AI_API_KEY;
  return k && k.trim() ? k.trim() : undefined;
}

export function baseUrlFor(provider: Provider): string | undefined {
  if (provider === "requesty") return "https://router.requesty.ai/v1";
  if (provider === "anthropic") return "https://api.anthropic.com";
  return process.env.AI_BASE_URL?.trim().replace(/\/+$/, "") || undefined;
}

export const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
export const monthKey = (t: number) => new Date(t).toISOString().slice(0, 7);

export function costOf(s: AiSettings, tokensIn: number, tokensOut: number): number {
  return (tokensIn * s.priceInPerM + tokensOut * s.priceOutPerM) / 1_000_000;
}
