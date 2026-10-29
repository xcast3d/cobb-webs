import { defineConfig } from "vite";

// Same Google Tag Manager container as xcast3d.com. Build only, so local dev
// and the browser tests never send analytics; the embed and extension never
// include it.
const GTM_ID = "GTM-W537F4V8";
const googleTagManager = {
  name: "xcast3d-google-tag-manager",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "script",
      injectTo: "head-prepend",
      children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
    },
    {
      tag: "noscript",
      injectTo: "body-prepend",
      children: `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
    },
  ],
};

export default defineConfig({
  base: "./",
  plugins: [googleTagManager],
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
