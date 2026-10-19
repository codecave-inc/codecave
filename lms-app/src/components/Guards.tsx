import { useConvexAuth, useQuery } from "convex/react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { ScreenSpinner } from "./ui";

/** Login / sign-up pages: signed-in people are sent on to the app. */
function PublicOnly() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <ScreenSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** App pages: need a session, and a finished learner profile (age / terms / code of conduct). */
function RequireLearner() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");

  if (isLoading) return <ScreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me === undefined) return <ScreenSpinner label="Loading your account" />;
  if (me === null) return <Navigate to="/login" replace />;
  if (me.needsProfileCompletion) return <Navigate to="/complete-profile" replace />;
  return <Outlet />;
}

export const Guards = { PublicOnly, RequireLearner };
