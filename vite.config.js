import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  define: {
    __COBWEBS_BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rolldownOptions: {
      input: { demo: "index.html", generator: "generator.html" },
    },
  },
});
