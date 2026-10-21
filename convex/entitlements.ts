import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { CONTENT_ROLES, getStaffProfile } from "./permissions";

type Ctx = QueryCtx | MutationCtx;

export type Access =
  | { ok: true; staffPreview: boolean }
  | { ok: false; reason: "signed_out" | "pro_required" | "not_available" };

/**
 * Does this person have Pro? Phase 6 (subscriptions) replaces the body of
 * this one function; every protected query already goes through it.
 * Until then nobody is Pro, except when the owner flips the setting
 * `private.openAccess` to "true" in Settings (so all published lessons can
 * be tried before payments go live).
 */
export async function hasPro(ctx: Ctx, _userId: Id<"users">): Promise<boolean> {
  const flag = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "private.openAccess")).first();
  return flag?.value === "true";
}

/**
 * The one place that decides whether a person may open a lesson.
 * Staff with a content role may open anything, including drafts (to preview).
 */
export async function lessonAccess(ctx: Ctx, userId: Id<"users"> | null, lesson: Doc<"lessons">): Promise<Access> {
  if (!userId) return { ok: false, reason: "signed_out" };
  const staff = await getStaffProfile(ctx, userId);
  if (staff && CONTENT_ROLES.includes(staff.role)) return { ok: true, staffPreview: lesson.status !== "published" };
  const course = await ctx.db.get(lesson.courseId);
  if (!course || course.status !== "published" || lesson.status !== "published") return { ok: false, reason: "not_available" };
  if (lesson.isFreePreview || (await hasPro(ctx, userId))) return { ok: true, staffPreview: false };
  return { ok: false, reason: "pro_required" };
}

export async function currentUser(ctx: Ctx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}
