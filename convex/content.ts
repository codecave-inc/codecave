import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public read-only queries over site content. These power the live
 * site (portfolio grids, sponsor wall, FAQ, pricing checker). Only
 * published:true rows are returned — the admin dashboard (phase 2)
 * can stage unpublished edits without them going live.
 *
 * No mutations live here on purpose: writing content is an
 * authenticated, admin-only action, added alongside the dashboard.
 */

export const listPortfolio = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const rows = await ctx.db
      .query("portfolioItems")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const filtered = category ? rows.filter((r) => r.category === category) : rows;
    return filtered.sort((a, b) => a.order - b.order);
  },
});

export const listSponsors = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("sponsors")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    return rows.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  },
});

export const listFaq = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("faqEntries")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const listPricingTiers = query({
  args: { checker: v.union(v.literal("website"), v.literal("mobile")) },
  handler: async (ctx, { checker }) => {
    const rows = await ctx.db
      .query("pricingTiers")
      .withIndex("by_checker", (q) => q.eq("checker", checker))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.value ?? null;
  },
});
