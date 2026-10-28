import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist/demo",
    rolldownOptions: {
      input: { demo: "index.html", generator: "generator.html" },
    },
  },
});
