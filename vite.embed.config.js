import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/embed",
    lib: {
      entry: "src/index.js",
      name: "CobbWebs",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "es" ? "cobb-webs.js" : "cobb-webs.min.js",
    },
  },
});
