import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
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
 * of functions in convex/admin*.ts.
 *
 * Right after saving, each mutation schedules the email action
 * (convex/email.ts) to send a "thanks" email to the visitor and a
 * notification to the team. Scheduled rather than awaited, so a slow
 * or failed email never delays or breaks the form submission itself.
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
    const id = await ctx.db.insert("projectBriefs", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.name,
      formLabel: "Project Brief",
      fields: [
        { label: "Name", value: args.name },
        { label: "Email", value: args.email },
        { label: "Project type", value: args.projectType },
        { label: "Budget range", value: args.budgetRange || "—" },
        { label: "Timeline", value: args.timeline || "—" },
        { label: "Estimate selected", value: args.tierEstimate || "—" },
        { label: "Details", value: args.details },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("trainingApplications", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.fullName,
      formLabel: args.program === "ai_utility" ? "AI Utility Training Application" : "AI-Assisted Dev Training Application",
      fields: [
        { label: "Full name", value: args.fullName },
        { label: "Email", value: args.email },
        { label: "Track", value: args.track },
        { label: "Organisation", value: args.organisation || "—" },
        { label: "Cohort size", value: args.cohortSize ? String(args.cohortSize) : "—" },
        { label: "Notes", value: args.notes || "—" },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("hackathonWaitlist", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.fullName,
      formLabel: "Hackathon 27 Waitlist Signup",
      fields: [
        { label: "Full name", value: args.fullName },
        { label: "Email", value: args.email },
        { label: "Role", value: args.role },
        { label: "School / organisation", value: args.school || "—" },
        { label: "Notes", value: args.notes || "—" },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("ambassadorApplications", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.fullName,
      formLabel: "Campus Ambassador Application",
      fields: [
        { label: "Full name", value: args.fullName },
        { label: "Email", value: args.email },
        { label: "School", value: args.school },
        { label: "Graduation year", value: args.graduationYear ? String(args.graduationYear) : "—" },
        { label: "Why them", value: args.whyYou },
        { label: "Links / portfolio", value: args.linksOrPortfolio || "—" },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("partnershipProposals", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.contactName,
      formLabel: "Partnership Proposal",
      fields: [
        { label: "Contact name", value: args.contactName },
        { label: "Email", value: args.email },
        { label: "Organisation", value: args.organisation },
        { label: "Partnership type", value: args.partnershipType },
        { label: "Details", value: args.details },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("sponsorInquiries", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.contactName,
      formLabel: "Sponsor Inquiry",
      fields: [
        { label: "Contact name", value: args.contactName },
        { label: "Email", value: args.email },
        { label: "Organisation", value: args.organisation || "—" },
        { label: "Sponsor type", value: args.sponsorType },
        { label: "Initiative", value: args.initiative || "—" },
        { label: "Details", value: args.details || "—" },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("productNotify", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.email,
      formLabel: "Product Notify-Me Signup",
      fields: [
        { label: "Email", value: args.email },
        { label: "Product", value: args.product },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
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
    const id = await ctx.db.insert("contactMessages", {
      ...args,
      submittedAt: Date.now(),
      status: "new",
    });
    await ctx.scheduler.runAfter(0, internal.email.sendFormEmails, {
      visitorEmail: args.email,
      visitorName: args.fullName,
      formLabel: "Contact Message",
      fields: [
        { label: "Full name", value: args.fullName },
        { label: "Email", value: args.email },
        { label: "Subject", value: args.subject || "—" },
        { label: "Message", value: args.message },
        { label: "Submitted from", value: args.source || "—" },
      ],
    });
    return id;
  },
});
