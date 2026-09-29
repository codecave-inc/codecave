import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

/**
 * Admin-only CRUD over the content tables that power the public site
 * (portfolio, sponsors, FAQ, pricing tiers, misc settings). The public
 * read side of these lives in convex/content.ts and only ever sees
 * published:true rows — so an admin can stage a draft here without it
 * going live.
 */

// ---------------------------------------------------------------- portfolio
export const listPortfolioAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("portfolioItems").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const savePortfolioItem = mutation({
  args: {
    id: v.optional(v.id("portfolioItems")),
    title: v.string(),
    description: v.string(),
    category: v.union(v.literal("website"), v.literal("mobile"), v.literal("automation"), v.literal("training")),
    tags: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    published: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (id) { await ctx.db.patch(id, fields); return id; }
    return await ctx.db.insert("portfolioItems", fields);
  },
});

export const deletePortfolioItem = mutation({
  args: { id: v.id("portfolioItems") },
  handler: async (ctx, { id }) => { await requireAdmin(ctx); await ctx.db.delete(id); },
});

// ----------------------------------------------------------------- sponsors
export const listSponsorsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("sponsors").collect();
    return rows.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  },
});

export const saveSponsor = mutation({
  args: {
    id: v.optional(v.id("sponsors")),
    name: v.string(),
    kind: v.union(v.literal("individual"), v.literal("organisation")),
    rank: v.optional(v.number()),
    logoUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    published: v.boolean(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (id) { await ctx.db.patch(id, fields); return id; }
    return await ctx.db.insert("sponsors", fields);
  },
});

export const deleteSponsor = mutation({
  args: { id: v.id("sponsors") },
  handler: async (ctx, { id }) => { await requireAdmin(ctx); await ctx.db.delete(id); },
});

// -------------------------------------------------------------------- FAQ
export const listFaqAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("faqEntries").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const saveFaqEntry = mutation({
  args: {
    id: v.optional(v.id("faqEntries")),
    question: v.string(),
    answer: v.string(),
    order: v.number(),
    published: v.boolean(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (id) { await ctx.db.patch(id, fields); return id; }
    return await ctx.db.insert("faqEntries", fields);
  },
});

export const deleteFaqEntry = mutation({
  args: { id: v.id("faqEntries") },
  handler: async (ctx, { id }) => { await requireAdmin(ctx); await ctx.db.delete(id); },
});

// --------------------------------------------------------------- pricing
export const listPricingTiersAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("pricingTiers").collect();
    return rows.sort((a, b) => a.checker.localeCompare(b.checker) || a.order - b.order);
  },
});

export const savePricingTier = mutation({
  args: {
    id: v.optional(v.id("pricingTiers")),
    checker: v.union(v.literal("website"), v.literal("mobile")),
    name: v.string(),
    minScore: v.number(),
    priceRange: v.string(),
    description: v.string(),
    timeline: v.string(),
    approach: v.string(),
    order: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (id) { await ctx.db.patch(id, fields); return id; }
    return await ctx.db.insert("pricingTiers", fields);
  },
});

export const deletePricingTier = mutation({
  args: { id: v.id("pricingTiers") },
  handler: async (ctx, { id }) => { await requireAdmin(ctx); await ctx.db.delete(id); },
});

// -------------------------------------------------------------- settings
export const listSettingsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("siteSettings").collect();
  },
});

export const saveSetting = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) { await ctx.db.patch(existing._id, { value }); return existing._id; }
    return await ctx.db.insert("siteSettings", { key, value });
  },
});
