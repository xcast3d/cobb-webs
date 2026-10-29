import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rolldownOptions: {
      input: { demo: "index.html", generator: "generator.html" },
    },
  },
});
