import { ConvexReactClient } from "convex/react";

export const CONVEX_URL: string = import.meta.env.VITE_CONVEX_URL ?? "";
export const GOOGLE_ENABLED: boolean = import.meta.env.VITE_GOOGLE_ENABLED === "true";

// An empty URL would throw inside the client; the app shows a setup screen instead (see main.tsx).
export const convex = new ConvexReactClient(CONVEX_URL || "https://not-configured.invalid");
