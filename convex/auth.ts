import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Admin login for the (future) /portal-<random> dashboard.
 * Password provider = email + password, no third-party OAuth needed
 * for a two-person team. Swap or add providers later if needed
 * (e.g. Password + an email-link "magic code" as a second factor).
 *
 * Accounts are NOT self-service: there is no public sign-up form on
 * the site. The owner creates admin accounts from the Convex
 * dashboard (Data tab) or a one-off script — see README in the
 * dashboard phase for the exact steps once that's built.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
