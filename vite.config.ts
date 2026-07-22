import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import legacy from "@vitejs/plugin-legacy";

export default defineConfig(({ mode }) => ({
  // Absolute base so assets resolve correctly on every route (e.g. /auth).
  // A relative "./" base 404s assets on sub-routes → blank screen.
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 7', 'iOS >= 12'],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
