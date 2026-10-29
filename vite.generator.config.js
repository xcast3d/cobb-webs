import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/generator",
    lib: {
      entry: "src/generator/index.js",
      name: "CobwebGenerator",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "es" ? "cobweb-generator.js" : "cobweb-generator.min.js",
    },
  },
});
