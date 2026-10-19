import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CodeCave Inc. — Convex schema
 *
 * Two families of tables:
 *  1. Form submissions (public insert via mutations, admin-only read)
 *  2. Site content (public read via queries, admin-only write)
 *
 * Every submission table shares: submittedAt, status, and a "source"
 * field noting which page it came from — useful once the admin
 * dashboard needs to triage/filter.
 */

/**
 * Staff roles (stored in adminProfiles — NEVER on the shared users
 * table, so a student account can't acquire one by accident).
 *  - owner:      Super Admin. Everything, including team management.
 *  - editor:     Site editor. Public-site content + form submissions.
 *  - instructor: LMS course content and grading (LMS admin, later phases).
 *  - moderator:  LMS comment / community moderation (later phases).
 */
export const staffRole = v.union(
  v.literal("owner"),
  v.literal("editor"),
  v.literal("instructor"),
  v.literal("moderator")
);

const submissionMeta = {
  submittedAt: v.number(),
  status: v.union(v.literal("new"), v.literal("read"), v.literal("archived")),
  source: v.optional(v.string()), // page path the form was submitted from
};

export default defineSchema({
  // Convex Auth's own tables (users, sessions, accounts, etc.)
  ...authTables,

  // ---------------------------------------------------------------
  // Form submissions — one table per form on the site
  // ---------------------------------------------------------------

  projectBriefs: defineTable({
    ...submissionMeta,
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
    tierEstimate: v.optional(v.string()), // carried over from pricing checker, if used
  }).index("by_status", ["status"]),

  trainingApplications: defineTable({
    ...submissionMeta,
    program: v.union(v.literal("ai_utility"), v.literal("ai_assisted_dev")),
    track: v.string(), // e.g. "managers_staff", "higher_institution", "high_school", "teams"
    fullName: v.string(),
    email: v.string(),
    organisation: v.optional(v.string()),
    cohortSize: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_program", ["program"]).index("by_status", ["status"]),

  hackathonWaitlist: defineTable({
    ...submissionMeta,
    fullName: v.string(),
    email: v.string(),
    role: v.union(v.literal("participant"), v.literal("mentor"), v.literal("sponsor")),
    school: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_role", ["role"]).index("by_status", ["status"]),

  ambassadorApplications: defineTable({
    ...submissionMeta,
    fullName: v.string(),
    email: v.string(),
    school: v.string(),
    graduationYear: v.optional(v.number()),
    whyYou: v.string(),
    linksOrPortfolio: v.optional(v.string()),
  }).index("by_status", ["status"]),

  partnershipProposals: defineTable({
    ...submissionMeta,
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
  }).index("by_status", ["status"]),

  sponsorInquiries: defineTable({
    ...submissionMeta,
    contactName: v.string(),
    email: v.string(),
    organisation: v.optional(v.string()),
    sponsorType: v.union(v.literal("individual"), v.literal("organisation")),
    initiative: v.optional(v.string()), // which initiative they want to back
    details: v.optional(v.string()),
  }).index("by_status", ["status"]),

  productNotify: defineTable({
    ...submissionMeta,
    email: v.string(),
    product: v.union(
      v.literal("smart_ai_reminder"),
      v.literal("ai_powered_lms"),
      v.literal("muta"),
      v.literal("all")
    ),
  }).index("by_status", ["status"]),

  contactMessages: defineTable({
    ...submissionMeta,
    fullName: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
  }).index("by_status", ["status"]),

  // ---------------------------------------------------------------
  // Site content — managed from the admin dashboard, read by the
  // public site. Empty at first; the dashboard phase will seed and
  // edit these. Public queries for these live in convex/content.ts.
  // ---------------------------------------------------------------

  portfolioItems: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("website"),
      v.literal("mobile"),
      v.literal("automation"),
      v.literal("training")
    ),
    tags: v.array(v.string()), // e.g. ["lms","ecommerce"] — matches existing filter chips
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    published: v.boolean(),
    order: v.number(),
  }).index("by_category", ["category"]).index("by_published", ["published"]),

  sponsors: defineTable({
    name: v.string(),
    kind: v.union(v.literal("individual"), v.literal("organisation")),
    rank: v.optional(v.number()), // 1-3 for the recognition wall; omit to leave unranked
    logoUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    published: v.boolean(),
  }).index("by_kind", ["kind"]).index("by_published", ["published"]),

  faqEntries: defineTable({
    question: v.string(),
    answer: v.string(),
    order: v.number(),
    published: v.boolean(),
  }).index("by_published", ["published"]),

  pricingTiers: defineTable({
    checker: v.union(v.literal("website"), v.literal("mobile")),
    name: v.string(), // "Starter" | "Growth" | "Enterprise"
    minScore: v.number(),
    priceRange: v.string(),
    description: v.string(),
    timeline: v.string(),
    approach: v.string(),
    order: v.number(),
  }).index("by_checker", ["checker"]),

  siteSettings: defineTable({
    key: v.string(), // e.g. "hackathonDate", "contactPhone", "contactAddress", "homepageStats"
    value: v.string(), // stored as string/JSON; parsed by the consumer
  }).index("by_key", ["key"]),

  // ---------------------------------------------------------------
  // Admin users — managed by Convex Auth (see convex/auth.ts).
  // Convex Auth manages its own internal tables automatically;
  // this table is for app-level role info layered on top.
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // Academy content (Phase 2). Edited by staff in the admin portal;
  // students read it through convex/courses.ts, which never exposes
  // drafts or the instructor-only fields.
  // ---------------------------------------------------------------
  courses: defineTable({
    slug: v.string(),
    title: v.string(),
    type: v.union(v.literal("focused"), v.literal("utility")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("coming_soon")),
    tagline: v.optional(v.string()),
    description: v.string(),
    thumbnailUrl: v.optional(v.string()),
    recommendedOrder: v.number(),
    // "Before Module 1" checklist, editable without redeploying.
    setupGuide: v.optional(v.array(v.object({ id: v.string(), title: v.string(), detail: v.string() }))),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]).index("by_status", ["status"]),

  modules: defineTable({
    courseId: v.id("courses"),
    number: v.number(),
    title: v.string(),
    outcome: v.optional(v.string()),
    order: v.number(),
  }).index("by_courseId", ["courseId", "order"]),

  lessons: defineTable({
    courseId: v.id("courses"),
    moduleId: v.optional(v.id("modules")), // utility-course lessons have no module
    number: v.number(),
    order: v.number(),
    title: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("coming_soon")),
    isFreePreview: v.boolean(),
    summary: v.string(),
    youtubeVideoId: v.optional(v.string()),
    durationSec: v.number(),
    objectives: v.array(v.string()),
    keyConcepts: v.array(v.string()),
    notesMd: v.string(),
    promptCards: v.array(v.object({ title: v.string(), prompt: v.string() })),
    taskMd: v.string(),
    pitfalls: v.array(v.string()),
    chapters: v.array(v.object({ startSec: v.number(), title: v.string() })),
    tools: v.array(v.string()),
    studentOutput: v.string(),
    evidenceMd: v.string(), // what the student submits (assessments come in Phase 5)
    assetsNote: v.string(),
    resources: v.array(v.object({ title: v.string(), url: v.string() })),
    // Instructor-only: never returned by student-facing queries.
    recordingFlow: v.array(v.string()),
    lastVerifiedAt: v.optional(v.number()),
  })
    .index("by_courseId", ["courseId", "order"])
    .index("by_moduleId", ["moduleId", "order"]),

  transcriptChunks: defineTable({
    lessonId: v.id("lessons"),
    order: v.number(),
    startSec: v.number(),
    endSec: v.number(),
    text: v.string(),
  }).index("by_lessonId", ["lessonId", "order"]),

  waitlist: defineTable({
    email: v.string(),
    courseId: v.id("courses"),
    createdAt: v.number(),
  }).index("by_course_email", ["courseId", "email"]),

  setupProgress: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    doneIds: v.array(v.string()),
  }).index("by_user_course", ["userId", "courseId"]),

  adminProfiles: defineTable({
    userId: v.id("users"), // Convex Auth's users table
    role: staffRole,
    addedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ---------------------------------------------------------------
  // CodeCave Academy (LMS) — learner profile. One row per student
  // user. Stable identity/consent data only; high-churn data (XP,
  // streaks, progress) gets its own tables in later phases.
  // ---------------------------------------------------------------
  profiles: defineTable({
    userId: v.id("users"),
    country: v.optional(v.string()),
    // We store a band, not a date of birth: enough to enforce the 16+
    // rule and the guardian-permission rule for 16-17, nothing more.
    ageBand: v.optional(v.union(v.literal("16-17"), v.literal("18+"))),
    guardianConsent: v.optional(v.boolean()),
    termsAcceptedAt: v.optional(v.number()),
    conductAcceptedAt: v.optional(v.number()),
    // Set once age/terms/code-of-conduct are confirmed. Google sign-ins
    // start without it and are sent to a "complete your profile" step.
    signupCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ---------------------------------------------------------------
  // Audit trail for security-relevant admin actions (role changes,
  // account creation, deleting people's submissions).
  // ---------------------------------------------------------------
  auditLog: defineTable({
    actorId: v.optional(v.id("users")), // absent for CLI / system actions
    action: v.string(), // e.g. "staff.role_set"
    target: v.optional(v.string()),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
