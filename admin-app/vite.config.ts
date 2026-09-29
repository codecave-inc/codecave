import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base path MUST match the unguessable route this app is served at
// (see the rewrite in the main site's vercel.json). If you ever
// regenerate the slug, update it in both places.
export default defineConfig({
  plugins: [react()],
  base: "/portal-30ye9dy96d/",
  resolve: {
    alias: {
      // Points at the repo-root convex/ folder regardless of how deep
      // the importing file lives — avoids fragile ../../.. counting.
      "@convex": path.resolve(__dirname, "../convex"),
    },
  },
});
