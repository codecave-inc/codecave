import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import { logAudit } from "./permissions";
import type { Id, TableNames } from "./_generated/dataModel";

/**
 * Admin views over the 8 form-submission tables. Rather than 8x near-
 * identical list/updateStatus/remove functions, this factory builds
 * them — Convex's codegen only cares that each export is a valid
 * query/mutation value, so this is equivalent to writing them by hand.
 *
 * SECURITY: `id` is validated with v.id(<this table>), so a function
 * for one table can only ever touch rows of that table. (It used to
 * take a bare string, which let any admin delete any document in the
 * database by ID — including student data and other admins' records.)
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

type SubmissionTable = (typeof SUBMISSION_TABLES)[number];

const statusValidator = v.union(v.literal("new"), v.literal("read"), v.literal("archived"));

function makeList(table: SubmissionTable) {
  return query({
    args: { status: v.optional(statusValidator) },
    handler: async (ctx, { status }) => {
      await requireAdmin(ctx);
      const base = status
        ? ctx.db.query(table as TableNames).withIndex("by_status" as any, (q: any) => q.eq("status", status))
        : ctx.db.query(table as TableNames);
      // Newest first, bounded so the table can grow without slowing the dashboard.
      return await base.order("desc").take(500);
    },
  });
}

function makeUpdateStatus(table: SubmissionTable) {
  return mutation({
    args: { id: v.id(table), status: statusValidator },
    handler: async (ctx, { id, status }) => {
      await requireAdmin(ctx);
      await ctx.db.patch(id as Id<"projectBriefs">, { status });
    },
  });
}

function makeRemove(table: SubmissionTable) {
  return mutation({
    args: { id: v.id(table) },
    handler: async (ctx, { id }) => {
      const admin = await requireAdmin(ctx);
      await ctx.db.delete(id as Id<"projectBriefs">);
      await logAudit(ctx, { actorId: admin.userId, action: "submission.removed", target: table, detail: String(id) });
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

/** One number per table, for the dashboard's "new submissions" badges (capped at 500 per table). */
export const countNewByTable = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const counts: Record<string, number> = {};
    for (const table of SUBMISSION_TABLES) {
      const rows = await ctx.db
        .query(table as TableNames)
        .withIndex("by_status" as any, (q: any) => q.eq("status", "new"))
        .take(500);
      counts[table] = rows.length;
    }
    return counts;
  },
});
