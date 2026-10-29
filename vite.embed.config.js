import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/embed",
    lib: {
      entry: "src/index.js",
      name: "Cobwebs",
      formats: ["es", "iife"],
      fileName: (format) => (format === "es" ? "cobwebs.js" : "cobwebs.min.js"),
    },
  },
});
