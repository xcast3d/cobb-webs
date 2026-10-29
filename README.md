# Cobb Webs

A small, isolated “welcome back” scene: brush through old silk, switch on the light, and return to the website beneath it. Version 0.7.0.

## Develop

Use Node 22.12+ (tested with Node 26).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. **Tune the scene** exposes geometry and lighting controls; **Art generator** opens the standalone artwork tool. Replay randomizes the seed, all web sliders, lighting-matched silk, and lighting, and turns interaction and light movement back on. Days away and detail selections remain unchanged. Restore silk preserves the current settings. New seed changes only the seed. Days away and detail reset growth-related settings.

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
  src="https://example.com/assets/cobb-webs.min.js"
  data-cobb-webs
  data-min-days="14"
  data-preset="moonlit-attic"
  data-cobbwebsbug="true"
  defer
></script>
```

The first visit stores a timestamp without showing the scene. Returning after the minimum days shows it once per tab session. Storage is local to the host origin; blocked storage fails quietly. For a preview add `data-test="true" data-days="127"`.

Replace the example `src` with the exact public URL where you uploaded `cobb-webs.min.js`. For WordPress, add the script through a footer-code tool or immediately before `</body>` in the theme, then purge WordPress and CDN caches. To serve the file from the active theme, upload it to the theme's `js` directory and use:

```php
<script
  src="<?php echo esc_url(get_stylesheet_directory_uri()); ?>/js/cobb-webs.min.js"
  data-cobb-webs
  data-min-days="14"
  data-cobbwebsbug="true"
  defer
></script>
```

`get_stylesheet_directory_uri()` follows the active child theme; use `get_template_directory_uri()` only when the file belongs to the parent theme. Opening the resolved script URL directly must show JavaScript rather than an HTML error page.

Supported attributes: `data-min-days`, `data-always`, `data-test`, `data-days`, `data-preset`, `data-seed`, `data-silk` (`light`, `silver`, `white`, `gold`), `data-eyebrow`, `data-title`, `data-sentence`, `data-button`, `data-bugs`, and `data-cobbwebsbug`. There are no runtime network requests beyond loading the script.

Set `data-always="true"` to show the experience on every page load, ignoring elapsed-day and session checks. In always mode, the default sentence is simply “We kept the lights off for you.” Custom sentences may use `{days}` and `{dayLabel}`.

```html
<script
  src="https://example.com/assets/cobb-webs.min.js"
  data-cobb-webs
  data-always="true"
  data-eyebrow="Something has been waiting"
  data-title="Welcome in."
  data-sentence="We kept the lights off for you."
  data-button="Enter site →"
  defer
></script>
```

`data-cobbwebsbug="true"` is optional and disabled by default. It leaves a small spiderweb button in the lower corner after the scene closes. Visitors can replay the experience and adjust web density, light level, interactive silk, and slow light movement. The full studio controls remain demo-only.

### Customizing the welcome card

The experience uses Shadow DOM so the host site's ordinary CSS cannot accidentally restyle it. Site owners can intentionally customize the welcome card by setting `--cobb-*` properties on the generated `<cobb-webs-scene>` element:

```css
cobb-webs-scene {
  --cobb-font-family: "Inter", sans-serif;
  --cobb-card-width: 520px;
  --cobb-card-padding: 48px;
  --cobb-card-background: #fff;
  --cobb-card-color: #17212b;
  --cobb-card-border: 1px solid #dbe2e8;
  --cobb-card-radius: 24px;
  --cobb-card-shadow: 0 30px 100px rgb(0 0 0 / 35%);
  --cobb-card-align: left;
  --cobb-eyebrow-color: #7b5cff;
  --cobb-eyebrow-size: 11px;
  --cobb-eyebrow-spacing: 0.18em;
  --cobb-title-size: 44px;
  --cobb-title-spacing: -0.04em;
  --cobb-title-weight: 700;
  --cobb-sentence-color: #637080;
  --cobb-sentence-size: 17px;
  --cobb-button-background: #17212b;
  --cobb-button-color: #fff;
  --cobb-button-border: 0;
  --cobb-button-radius: 999px;
  --cobb-button-padding: 14px 24px;
  --cobb-button-weight: 650;
}
```

Only declare the properties you want to override. Content remains controlled independently through `data-eyebrow`, `data-title`, `data-sentence`, and `data-button`.

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
  cobbwebsbug: true,
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
- Slack curves straighten as endpoints pull apart. Silk brightness responds to strand orientation and local light color. Scene silk defaults to `light`, reflecting the local illuminant without a white washout. The light temperature spans icy blue, neutral white, and amber.
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
- `dist/index.html`: built demo entry point, ready to deploy at a subpath such as `/cobb-webs/`.
- `dist/generator.html`: built art tool page, alongside the demo; deploy its referenced assets with it.

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
