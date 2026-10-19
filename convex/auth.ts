import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { StudentResetEmail, StudentVerifyEmail } from "./authEmails";
import { getStaffProfile } from "./permissions";
import { studentProfile, validateStudentPassword } from "./studentSignup";

/**
 * Two completely separate ways to sign in, so staff and students can
 * never be mixed up:
 *
 *  1. "password"  — STAFF. Used by the admin portal. Public sign-up is
 *     closed here: accounts are created only with the CLI
 *     (adminAuth:createAdmin). Being signed in is not enough to do
 *     anything; every admin function also checks adminProfiles.
 *
 *  2. "student"   — CodeCave Academy learners. Public sign-up with
 *     email verification (8-digit code sent via Brevo), password reset,
 *     and — if AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are set — Google.
 *
 * The createOrUpdateUser callback below never links a new sign-in
 * method into a staff user, and never merges two learners' accounts
 * unless the email is verified.
 */

// --- 1. Staff -----------------------------------------------------------
const StaffPassword = Password({
  profile(params) {
    if (params.flow === "signUp") {
      throw new ConvexError("Sign-up isn't available here.");
    }
    // Same as the library default (email exactly as typed) so existing
    // admin logins keep working unchanged.
    return { email: params.email as string };
  },
});

// --- 2. Students --------------------------------------------------------
const StudentPassword = Password({
  id: "student",
  // The library types `profile` as the users-table shape; the extra `signup`
  // object is consumed by createOrUpdateUser below and never stored on users.
  profile: ((params: any) => studentProfile(params)) as any,
  validatePasswordRequirements: validateStudentPassword,
  verify: StudentVerifyEmail,
  reset: StudentResetEmail,
});

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const STAFF_PROVIDER_ID = "password";

async function uniqueVerifiedLearner(ctx: MutationCtx, email: string): Promise<Doc<"users"> | null> {
  const matches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(10);
  const learners: Doc<"users">[] = [];
  for (const user of matches) {
    if (user.emailVerificationTime === undefined) continue;
    if (await getStaffProfile(ctx, user._id)) continue; // staff are never merge targets
    learners.push(user);
  }
  return learners.length === 1 ? learners[0] : null;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [StaffPassword, StudentPassword, ...(googleEnabled ? [Google] : [])],
  callbacks: {
    /**
     * Allowed places a sign-in may send the browser back to: SITE_URL plus
     * any origins listed (comma-separated) in AUTH_ALLOWED_ORIGINS, e.g.
     * "https://lms.codecave.com.ng,http://localhost:5174".
     */
    async redirect({ redirectTo }) {
      const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) return `${base}${redirectTo}`;
      const allowed = [process.env.SITE_URL, ...(process.env.AUTH_ALLOWED_ORIGINS ?? "").split(",")]
        .map((o) => (o ?? "").trim().replace(/\/$/, ""))
        .filter(Boolean);
      for (const origin of allowed) {
        if (redirectTo === origin || redirectTo.startsWith(`${origin}/`) || redirectTo.startsWith(`${origin}?`)) {
          return redirectTo;
        }
      }
      throw new Error(`Invalid redirectTo ${redirectTo}`);
    },

    async createOrUpdateUser(rawCtx, args) {
      const ctx = rawCtx as unknown as MutationCtx;
      const { existingUserId, provider, type } = args;
      const profile = args.profile as Record<string, any>;
      const isStaffProvider = provider.id === STAFF_PROVIDER_ID;

      const providerSaysVerified =
        (provider.type === "oauth" || provider.type === "oidc") &&
        (provider as { allowDangerousEmailAccountLinking?: boolean }).allowDangerousEmailAccountLinking !== false;
      const emailVerified: boolean = Boolean(profile.emailVerified ?? providerSaysVerified);
      const verifiedStamp = emailVerified ? { emailVerificationTime: Date.now() } : {};

      const rawEmail = typeof profile.email === "string" ? profile.email : undefined;
      const email = rawEmail === undefined ? undefined : isStaffProvider ? rawEmail : rawEmail.trim().toLowerCase();
      const name = typeof profile.name === "string" ? profile.name : undefined;
      const image = typeof profile.image === "string" ? profile.image : undefined;

      // ---- Existing account: only mark verified / fill blanks. ----------
      if (existingUserId !== null) {
        const user = await ctx.db.get(existingUserId);
        await ctx.db.patch(existingUserId, {
          ...verifiedStamp,
          ...(user && user.name === undefined && name ? { name } : {}),
          ...(user && user.image === undefined && image ? { image } : {}),
        });
        // A learner who signed up with a password and ALSO has a verified
        // account from another sign-in method (e.g. Google): once they prove
        // the mailbox, attach this method to the established learner rather
        // than keeping two half-empty records of the same person.
        if (type === "verification" && emailVerified && !isStaffProvider && email) {
          const other = await uniqueVerifiedLearner(ctx, email);
          if (other && other._id !== existingUserId) return other._id;
        }
        return existingUserId;
      }

      // ---- New staff account (CLI only): plain user, no learner profile. --
      if (isStaffProvider) {
        return await ctx.db.insert("users", { ...(email ? { email } : {}), ...verifiedStamp });
      }

      // ---- New learner. -------------------------------------------------
      if (email) {
        const verifiedLearner = await uniqueVerifiedLearner(ctx, email);
        if (verifiedLearner) {
          if (type === "credentials") {
            throw new ConvexError(
              "An account with this email already exists. Sign in instead, or use “Forgot password”."
            );
          }
          if (emailVerified) {
            // e.g. Google sign-in with the same verified email: same person.
            await ctx.db.patch(verifiedLearner._id, {
              ...(verifiedLearner.name === undefined && name ? { name } : {}),
              ...(verifiedLearner.image === undefined && image ? { image } : {}),
            });
            return verifiedLearner._id;
          }
        }
      }

      const userId: Id<"users"> = await ctx.db.insert("users", {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
        ...(image ? { image } : {}),
        ...verifiedStamp,
      });
      const signup = profile.signup as
        | { country: string; ageBand: "16-17" | "18+"; guardianConsent: boolean; termsAcceptedAt: number; conductAcceptedAt: number }
        | undefined;
      await ctx.db.insert("profiles", {
        userId,
        createdAt: Date.now(),
        ...(signup ? { ...signup, signupCompletedAt: Date.now() } : {}),
      });
      return userId;
    },
  },
});
