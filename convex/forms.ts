import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public mutations — one per form on the site. Each is intentionally
 * narrow (exact fields the form collects) rather than one generic
 * "submit anything" mutation, so the admin dashboard gets typed,
 * queryable data instead of a blob of JSON per form.
 *
 * All of these are callable from the public internet (no auth) since
 * they're just "someone filled in a form" — that's expected. Reading
 * them back (for the admin dashboard) is a separate, auth-gated set
 * of functions in convex/admin.ts (added in the dashboard phase).
 */

export const submitProjectBrief = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    projectType: v.union(
      v.literal("web_app"),
      v.literal("mobile_app"),
      v.literal("automation"),
      v.literal("not_sure")
    ),
    budgetRange: v.optional(v.string()),
    timeline: v.optional(v.string()),
    details: v.string(),
    tierEstimate: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectBriefs", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitTrainingApplication = mutation({
  args: {
    program: v.union(v.literal("ai_utility"), v.literal("ai_assisted_dev")),
    track: v.string(),
    fullName: v.string(),
    email: v.string(),
    organisation: v.optional(v.string()),
    cohortSize: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trainingApplications", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitHackathonWaitlist = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    role: v.union(v.literal("participant"), v.literal("mentor"), v.literal("sponsor")),
    school: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("hackathonWaitlist", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitAmbassadorApplication = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    school: v.string(),
    graduationYear: v.optional(v.number()),
    whyYou: v.string(),
    linksOrPortfolio: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ambassadorApplications", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitPartnershipProposal = mutation({
  args: {
    contactName: v.string(),
    email: v.string(),
    organisation: v.string(),
    partnershipType: v.union(
      v.literal("university_hub"),
      v.literal("hackathon_sprint"),
      v.literal("tooling_platform"),
      v.literal("sponsorship_grant"),
      v.literal("other")
    ),
    details: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("partnershipProposals", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitSponsorInquiry = mutation({
  args: {
    contactName: v.string(),
    email: v.string(),
    organisation: v.optional(v.string()),
    sponsorType: v.union(v.literal("individual"), v.literal("organisation")),
    initiative: v.optional(v.string()),
    details: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sponsorInquiries", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitProductNotify = mutation({
  args: {
    email: v.string(),
    product: v.union(
      v.literal("smart_ai_reminder"),
      v.literal("ai_powered_lms"),
      v.literal("muta"),
      v.literal("all")
    ),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("productNotify", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});

export const submitContactMessage = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contactMessages", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
  },
});
