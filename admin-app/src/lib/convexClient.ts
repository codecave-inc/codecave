import { ConvexReactClient } from "convex/react";

// Same Convex deployment as the public site — set this via the
// VITE_CONVEX_URL environment variable (see admin-app/README.md).
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";

if (!CONVEX_URL) {
  // eslint-disable-next-line no-console
  console.warn("VITE_CONVEX_URL is not set — the admin app can't reach Convex yet.");
}

export const convex = new ConvexReactClient(CONVEX_URL);
