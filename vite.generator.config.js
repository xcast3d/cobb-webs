import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/generator",
    lib: {
      entry: "src/generator/index.js",
      name: "CobbWebGenerator",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "es" ? "cobb-web-generator.js" : "cobb-web-generator.min.js",
    },
  },
});
