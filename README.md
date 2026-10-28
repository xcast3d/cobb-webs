# Cobb Webs

A small, isolated “welcome back” scene: brush through old silk, switch on the light, and return to the website beneath it. Version 0.7.0.

## Develop

Use Node 22.12+ (tested with Node 26).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. **Tune the scene** exposes geometry and lighting controls; **Art generator** opens the standalone artwork tool. Replay preserves the seed and settings. New seed changes only the seed. Days away and detail reset growth-related settings.

```sh
npm test                  # Pure geometry, solver, lighting, visit policy
npm run build             # Demo + standalone ES module and classic script
npx playwright install chromium
npm run test:browser       # Requires the dev server above on port 5173
npm run preview           # Preview the built demo
```

## Project boundaries

```text
src/
  engine/       Seeded geometry, config, fixed-step physics, renderer, exports
  lighting/     Shared light field and dust/darkness rendering
  experience/   Shadow DOM scene, switch, welcome, bugs, visit policy
  demo/         Faux website, studio controls, demo-only styles
  index.js      Embed API and optional script-tag initialization
_archive/       Original HTML prototypes, preserved for comparison
```

The engine does not query controls, know about the welcome card, or own an animation loop. `generateWebs()` and `SilkPhysics` run without a browser. `WebEngine` accepts a canvas and light field; its caller supplies dimensions, frame delta, and pointer input. The demo never ships in the embed. The experience owns one animation loop and cancels it, its listeners, and its timers on destruction. It pauses while the tab is hidden.

## Embed

Build, then host `dist/embed/cobb-webs.min.js` on your site or CDN:

```html
<script
  src="/cobb-webs.min.js"
  data-cobb-webs
  data-min-days="14"
  data-preset="moonlit-attic"
  defer
></script>
```

The first visit stores a timestamp without showing the scene. Returning after the minimum days shows it once per tab session. Storage is local to the host origin; blocked storage fails quietly. For a preview add `data-test="true" data-days="127"`.

Supported attributes: `data-min-days`, `data-test`, `data-days`, `data-preset`, `data-seed`, `data-silk` (`silver`, `white`, `gold`), `data-message` (with `{days}`), `data-button`, `data-bugs`. There are no runtime network requests beyond loading the script.

Or use the ES module:

```js
import { init, show, destroy } from "./cobb-webs.js";

init({ minDays: 14 }); // Apply visit policy
const scene = show({
  // Explicit preview, bypasses visit policy
  days: 127,
  preset: "moonlit-attic",
  web: { seed: "COBB-0804", layers: 4, density: 65, silk: "silver" },
  lighting: { intensity: 85, fill: 24, warmth: 18, motion: true },
});
scene.updateWeb({ density: 80 });
scene.updateLight({ fill: 50 });
scene.turnOn();
destroy();
```

`show()` replaces the current API-owned scene. `createScene()` is also exported for independent instances; each instance must be destroyed by its owner. Listen on `document` for `cobbwebs:shown`, `cobbwebs:lit`, `cobbwebs:entered`, and `cobbwebs:skipped` (each includes `detail.days`). Styles live in Shadow DOM, page markup is unchanged, focus returns after dismissal, and Escape/Skip always exit. Reduced motion opens a static, lit welcome card immediately.

## Physics and lighting changes

- Continuous capture turns advance across radial spokes, with perimeter frame threads and deterministic patch aging.
- Fixed 120 Hz integration makes physics independent of display refresh rate. Pinned nodes remain fixed; constraints distribute correction by inverse mass and resist tension only.
- Cursor attraction gathers nearby silk. Sustained strain breaks it; connected-component traversal distinguishes supported silk from falling pieces. Untouched webs remain still.
- Slack curves straighten as endpoints pull apart. Silk brightness responds to strand orientation and local light color.
- Cool window light and warm side spill share a cached, interpolated color field. Window shadows widen with distance, light falls off across the scene, and optional slow motion models cloud cover.
- The darkness mask reuses its pixel buffer. Strands are batched by quantized color/brightness/width, avoiding thousands of per-frame gradients.

This is a 2D artistic silk simulation, not a material-accurate 3D model. Lighting uses Canvas 2D rather than WebGL. Resize regenerates geometry and clears brush damage. Sound, additional web species, page-element anchors, a lazy loader, and the Chrome extension remain future work. Strict CSP sites must permit the injected scene stylesheet; fullscreen/top-layer host dialogs can appear above the overlay. Browser verification currently covers Chromium.

## Standalone art generator

Open [generator.html](http://127.0.0.1:5173/generator.html) for the independent art tool. It uses neutral studio lighting, explicit artboard dimensions, an optional brush simulation, and charcoal/checkerboard previews. SVG and 2× PNG exports are transparent. Save settings downloads reproducible geometry configuration; brush damage is only captured in the image/vector exports.

The generator is a separate release boundary:

- `src/generator/index.js`: public canvas API and neutral light provider.
- `src/generator/app.js` and `style.css`: the artist-facing tool.
- `src/engine/`: shared geometry, physics, and rendering used by both products.
- `npm run build:generator`: independent ES module and classic-script library in `dist/generator/`.
- `dist/demo/generator.html`: built tool page, alongside the demo; deploy its referenced assets with it.

```js
import { createGenerator } from "./cobb-web-generator.js";

const tool = createGenerator(document.querySelector("canvas"), {
  width: 1600,
  height: 1200,
  seed: "MY-ARTWORK",
  layers: 3,
  silk: "white",
});
tool.generate({ density: 85 });
const svg = tool.svg();
const pngBlob = await tool.png();
```

The library owns no DOM UI, storage, event listeners, or animation loop. A caller can supply pointer coordinates in artwork pixels via `move`, enable `physics`, call `frame(seconds)` to simulate, and call `release()` when a gesture ends. Artboard dimensions are 64–4096 per side; PNG outputs twice those dimensions. Resizing regenerates the geometry. It can also be loaded as a classic script with the `CobbWebGenerator` global.

Nothing has been published. Before a public release, choose package names, licensing and artwork-use terms, and add settings import and documentation for artists. The generator and welcome-back embed can be versioned and distributed separately when needed.
