import { defineConfig } from "vite";
// Bundles the content script (scene + extension logic) for the unpacked extension in extension/.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "extension/dist",
    emptyOutDir: true,
    lib: {
      entry: "extension/src/content.js",
      name: "CobwebsExtension",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});
