import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path MUST match the unguessable route this app is served at
// (see the rewrite in the main site's vercel.json). If you ever
// regenerate the slug, update it in both places.
export default defineConfig({
  plugins: [react()],
  base: "/portal-30ye9dy96d/",
});
