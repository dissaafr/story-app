import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/story-app/",
  root: resolve(__dirname, "src"),
  publicDir: resolve(__dirname, "src", "public"),
  server: {
    https: true,
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
