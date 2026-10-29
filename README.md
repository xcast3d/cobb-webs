# Cobwebs

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
npm run build             # Demo + standalone ES module, classic script, extension
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
extension/      Chrome extension (Manifest V3); see docs/chrome-extension.md
_archive/       Original HTML prototypes, preserved for comparison
```

The engine does not query controls, know about the welcome card, or own an animation loop. `generateWebs()` and `SilkPhysics` run without a browser. `WebEngine` accepts a canvas and light field; its caller supplies dimensions, frame delta, and pointer input. The demo never ships in the embed. The experience owns one animation loop and cancels it, its listeners, and its timers on destruction. It pauses while the tab is hidden.

## Embed

Build, then host `dist/embed/cobwebs.min.js` on your site or CDN:

```html
<script
  src="https://example.com/assets/cobwebs.min.js"
  data-cobwebs
  data-min-days="14"
  data-preset="moonlit-attic"
  data-cobwebs-bug="true"
  defer
></script>
```

The first visit stores a timestamp without showing the scene. Returning after the minimum days shows it once per tab session. Storage is local to the host origin; blocked storage fails quietly. For a preview add `data-test="true" data-days="127"`.

Replace the example `src` with the exact public URL where you uploaded `cobwebs.min.js`. For WordPress, add the script through a footer-code tool or immediately before `</body>` in the theme, then purge WordPress and CDN caches. To serve the file from the active theme, upload it to the theme's `js` directory and use:

The demo's download link includes a unique build query such as `?v=mabc123` so CDN and browser caches fetch the current embed after every rebuild. The downloaded filename remains `cobwebs.min.js`; site owners can use their own version query when replacing a deployed copy.

```php
<script
  src="<?php echo esc_url(get_stylesheet_directory_uri()); ?>/js/cobwebs.min.js"
  data-cobwebs
  data-min-days="14"
  data-cobwebs-bug="true"
  defer
></script>
```

`get_stylesheet_directory_uri()` follows the active child theme; use `get_template_directory_uri()` only when the file belongs to the parent theme. Opening the resolved script URL directly must show JavaScript rather than an HTML error page.

Supported attributes: `data-min-days`, `data-always`, `data-test`, `data-days`, `data-preset`, `data-seed`, `data-silk` (`light`, `silver`, `white`, `gold`), `data-eyebrow`, `data-title`, `data-sentence`, `data-button`, `data-bugs`, and `data-cobwebs-bug`. There are no runtime network requests beyond loading the script.

Set `data-always="true"` to show the experience on every page load, ignoring elapsed-day and session checks. In always mode, the default sentence is simply “We kept the lights off for you.” Custom sentences may use `{days}` and `{dayLabel}`.

```html
<script
  src="https://example.com/assets/cobwebs.min.js"
  data-cobwebs
  data-always="true"
  data-eyebrow="Something has been waiting"
  data-title="Welcome in."
  data-sentence="We kept the lights off for you."
  data-button="Enter site →"
  defer
></script>
```

`data-cobwebs-bug="true"` is optional and disabled by default. It leaves a small spiderweb button in the lower corner after the scene closes. Visitors can replay the experience and adjust web density, light level, interactive silk, and slow light movement. The full studio controls remain demo-only.

### Customizing the welcome card

The experience uses Shadow DOM so the host site's ordinary CSS cannot accidentally restyle it. Site owners can intentionally customize the welcome card by setting `--cobwebs-*` properties on the generated `<cobwebs-scene>` element:

```css
cobwebs-scene {
  --cobwebs-font-family: "Inter", sans-serif;
  --cobwebs-card-width: 520px;
  --cobwebs-card-padding: 48px;
  --cobwebs-card-background: #fff;
  --cobwebs-card-color: #17212b;
  --cobwebs-card-border: 1px solid #dbe2e8;
  --cobwebs-card-radius: 24px;
  --cobwebs-card-shadow: 0 30px 100px rgb(0 0 0 / 35%);
  --cobwebs-card-align: left;
  --cobwebs-eyebrow-color: #7b5cff;
  --cobwebs-eyebrow-size: 11px;
  --cobwebs-eyebrow-spacing: 0.18em;
  --cobwebs-title-size: 44px;
  --cobwebs-title-spacing: -0.04em;
  --cobwebs-title-weight: 700;
  --cobwebs-sentence-color: #637080;
  --cobwebs-sentence-size: 17px;
  --cobwebs-button-background: #17212b;
  --cobwebs-button-color: #fff;
  --cobwebs-button-border: 0;
  --cobwebs-button-radius: 999px;
  --cobwebs-button-padding: 14px 24px;
  --cobwebs-button-weight: 650;
}
```

Only declare the properties you want to override. Content remains controlled independently through `data-eyebrow`, `data-title`, `data-sentence`, and `data-button`.

Or use the ES module:

```js
import { init, show, destroy } from "./cobwebs.js";

init({ minDays: 14 }); // Apply visit policy
const scene = show({
  // Explicit preview, bypasses visit policy
  days: 127,
  preset: "moonlit-attic",
  web: { seed: "COBWEB-0804", layers: 4, density: 65, silk: "silver" },
  lighting: { intensity: 85, fill: 24, warmth: 18, motion: true },
  cobwebsBug: true,
});
scene.updateWeb({ density: 80 });
scene.updateLight({ fill: 50 });
scene.turnOn();
destroy();
```

`show()` replaces the current API-owned scene. `createScene()` is also exported for independent instances; each instance must be destroyed by its owner. Listen on `document` for `cobwebs:shown`, `cobwebs:lit`, `cobwebs:entered`, and `cobwebs:skipped` (each includes `detail.days`). Styles live in Shadow DOM, page markup is unchanged, focus returns after dismissal, and Escape/Skip always exit. Reduced motion opens a static, lit welcome card immediately.

## Chrome extension

The extension shows the scene on any site you return to after being away long enough. It's on for every site by default; turn it off per site from the popup. The longer you're away, the heavier and more layered the webs. Everything is controlled from the toolbar popup; apart from the welcome scene, nothing is added to pages.

```sh
npm run build:extension   # Bundles extension/dist/content.js
npm run pack:extension    # Zips it to dist/extension/cobwebs-extension.zip
```

`npm run build` does both, and the demo's **Chrome extension** button offers the zip for manual install. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select the `extension/` folder. Rebuild and press reload on the extension card after changing `src/` or `extension/src/content.js`. Popup, options and background files load directly without a build.

The popup turns the extension off or on for the current site, sets when webs appear and how fast they grow in, and replays the scene on the current page. Visit times stay in `chrome.storage.local`; nothing leaves the browser. The browser tests in `tests/browser/extension.spec.js` load the extension themselves and do not need the dev server. Plan and status: [docs/chrome-extension.md](docs/chrome-extension.md).

## Physics and lighting changes

- Continuous capture turns advance across radial spokes, with perimeter frame threads and deterministic patch aging.
- Fixed 120 Hz integration makes physics independent of display refresh rate. Pinned nodes remain fixed; constraints distribute correction by inverse mass and resist tension only.
- Cursor attraction gathers nearby silk. Sustained strain breaks it; connected-component traversal distinguishes supported silk from falling pieces. Untouched webs remain still.
- Slack curves straighten as endpoints pull apart. Silk brightness responds to strand orientation and local light color. Scene silk defaults to `light`, reflecting the local illuminant without a white washout. The light temperature spans icy blue, neutral white, and amber.
- Cool window light and warm side spill share a cached, interpolated color field. Window shadows widen with distance, light falls off across the scene, and optional slow motion models cloud cover.
- The darkness mask reuses its pixel buffer. Strands are batched by quantized color/brightness/width, avoiding thousands of per-frame gradients.

This is a 2D artistic silk simulation, not a material-accurate 3D model. Lighting uses Canvas 2D rather than WebGL. Resize regenerates geometry and clears brush damage. Sound, additional web species, page-element anchors, and a lazy loader remain future work. Strict CSP sites must permit the injected scene stylesheet; fullscreen/top-layer host dialogs can appear above the overlay. Browser verification currently covers Chromium.

## Standalone art generator

Open [generator.html](http://127.0.0.1:5173/generator.html) for the independent art tool. It uses neutral studio lighting, explicit artboard dimensions, an optional brush simulation, and charcoal/checkerboard previews. SVG and 2× PNG exports are transparent. Save settings downloads reproducible geometry configuration; brush damage is only captured in the image/vector exports.

The generator is a separate release boundary:

- `src/generator/index.js`: public canvas API and neutral light provider.
- `src/generator/app.js` and `style.css`: the artist-facing tool.
- `src/engine/`: shared geometry, physics, and rendering used by both products.
- `npm run build:generator`: independent ES module and classic-script library in `dist/generator/`.
- `dist/index.html`: built demo entry point, ready to deploy at a subpath such as `/cobwebs/`.
- `dist/generator.html`: built art tool page, alongside the demo; deploy its referenced assets with it.

```js
import { createGenerator } from "./cobweb-generator.js";

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

The library owns no DOM UI, storage, event listeners, or animation loop. A caller can supply pointer coordinates in artwork pixels via `move`, enable `physics`, call `frame(seconds)` to simulate, and call `release()` when a gesture ends. Artboard dimensions are 64–4096 per side; PNG outputs twice those dimensions. Resizing regenerates the geometry. It can also be loaded as a classic script with the `CobwebGenerator` global.

Nothing has been published. Before a public release, choose package names, licensing and artwork-use terms, and add settings import and documentation for artists. The generator and welcome-back embed can be versioned and distributed separately when needed.
