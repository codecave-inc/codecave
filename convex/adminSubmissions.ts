import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import type { TableNames } from "./_generated/dataModel";

/**
 * Admin views over the 8 form-submission tables. Rather than 8x near-
 * identical list/updateStatus/remove functions, this factory builds
 * them — Convex's codegen only cares that each export is a valid
 * query/mutation value, so this is equivalent to writing them by hand.
 */
const SUBMISSION_TABLES = [
  "projectBriefs",
  "trainingApplications",
  "hackathonWaitlist",
  "ambassadorApplications",
  "partnershipProposals",
  "sponsorInquiries",
  "productNotify",
  "contactMessages",
] as const;

function makeList(table: (typeof SUBMISSION_TABLES)[number]) {
  return query({
    args: { status: v.optional(v.union(v.literal("new"), v.literal("read"), v.literal("archived"))) },
    handler: async (ctx, { status }) => {
      await requireAdmin(ctx);
      const rows = await ctx.db.query(table as TableNames).collect();
      const filtered = status ? rows.filter((r: any) => r.status === status) : rows;
      return filtered.sort((a: any, b: any) => b.submittedAt - a.submittedAt);
    },
  });
}

function makeUpdateStatus(table: (typeof SUBMISSION_TABLES)[number]) {
  return mutation({
    args: { id: v.string(), status: v.union(v.literal("new"), v.literal("read"), v.literal("archived")) },
    handler: async (ctx, { id, status }) => {
      await requireAdmin(ctx);
      await ctx.db.patch(id as any, { status });
    },
  });
}

function makeRemove(table: (typeof SUBMISSION_TABLES)[number]) {
  return mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
      await requireAdmin(ctx);
      await ctx.db.delete(id as any);
    },
  });
}

export const listProjectBriefs = makeList("projectBriefs");
export const updateProjectBriefStatus = makeUpdateStatus("projectBriefs");
export const removeProjectBrief = makeRemove("projectBriefs");

export const listTrainingApplications = makeList("trainingApplications");
export const updateTrainingApplicationStatus = makeUpdateStatus("trainingApplications");
export const removeTrainingApplication = makeRemove("trainingApplications");

export const listHackathonWaitlist = makeList("hackathonWaitlist");
export const updateHackathonWaitlistStatus = makeUpdateStatus("hackathonWaitlist");
export const removeHackathonWaitlist = makeRemove("hackathonWaitlist");

export const listAmbassadorApplications = makeList("ambassadorApplications");
export const updateAmbassadorApplicationStatus = makeUpdateStatus("ambassadorApplications");
export const removeAmbassadorApplication = makeRemove("ambassadorApplications");

export const listPartnershipProposals = makeList("partnershipProposals");
export const updatePartnershipProposalStatus = makeUpdateStatus("partnershipProposals");
export const removePartnershipProposal = makeRemove("partnershipProposals");

export const listSponsorInquiries = makeList("sponsorInquiries");
export const updateSponsorInquiryStatus = makeUpdateStatus("sponsorInquiries");
export const removeSponsorInquiry = makeRemove("sponsorInquiries");

export const listProductNotify = makeList("productNotify");
export const updateProductNotifyStatus = makeUpdateStatus("productNotify");
export const removeProductNotify = makeRemove("productNotify");

export const listContactMessages = makeList("contactMessages");
export const updateContactMessageStatus = makeUpdateStatus("contactMessages");
export const removeContactMessage = makeRemove("contactMessages");

/** One number per table, for the dashboard's "new submissions" badges. */
export const countNewByTable = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const counts: Record<string, number> = {};
    for (const table of SUBMISSION_TABLES) {
      const rows = await ctx.db.query(table as TableNames).collect();
      counts[table] = rows.filter((r: any) => r.status === "new").length;
    }
    return counts;
  },
});
