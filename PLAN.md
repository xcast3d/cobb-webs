# Cobb Webs: project plan

## Product direction: standalone generator

The generator is also an independent creative tool for artists, compositors,
and other uses beyond the welcome-back overlay. Treat it as a first-class
product with a separate UI and distributable library. Both products share
`src/engine`; generator code must not import the experience, visit policy,
faux site, or demo controls.

Implemented foundation: `generator.html`, explicit artwork dimensions,
neutral studio illumination, transparent PNG/SVG exports, settings download,
and independent `dist/generator` ES module/classic-script builds. The
welcome-back studio links to this tool rather than hiding scene layers to
imitate a generator.

Future generator work: settings import, saved presets, composition/placement
controls, additional web types, selectable export scale, artwork gallery,
licensing/use terms, and separate release/versioning. No publication yet.

## Implementation update — 2026-10-28

The v0.7 project is now a Vite application. See `README.md` for commands,
module boundaries, embed examples, and current limitations. The original
v0.6.2 HTML has moved to `_archive/cobb-webs-full-site-v062.html`.

Completed: separate engine / lighting / experience / demo modules; remove the
duplicate engine from the running app; isolate the scene in Shadow DOM; build
ES-module and classic-script embeds; add visit tracking and disposal; connected
capture spirals and perimeter frames; fixed-step tension physics; shared cool
and warm lighting; cached light field and batched silk rendering.

Next: tune realism against visual references, add sheet/tangle web types and
page-element anchors, consider a WebGL light mask and lazy loader, then build
the extension using the shared engine. Sound is not yet ported.

The sections below preserve the original prototype assessment and roadmap;
its “known issues” describe the archived file rather than the current app.

---

Status as of 2026-10-28: a working prototype in one file,
`cobb-webs-full-site-v062.html`. An older standalone generator (v0.4.9) is in
`_archive/`.

## What it is

Cobb Webs is a "welcome back" overlay for websites. When someone returns after
a long time away, the site greets them as a dark, forgotten room: dust floats in
a shaft of moonlight and cobwebs cover the screen. The longer they've been away,
the thicker the webs. The visitor can brush through the silk with the cursor.
When they flip the light switch, the room lights up, a few bugs scurry off the
screen, and a card says *"It's been 127 days since you were last here. We kept
the lights off for you."* Clicking **Enter site** fades the room away and leaves
the real site underneath, untouched.

It's a small, memorable moment for returning visitors, and the site needs no
changes beyond adding the overlay.

## How it works

Everything runs in the browser with no libraries, no network calls and no build
step. The overlay is a stack of full-screen layers above the page.

| Layer | What it does |
| --- | --- |
| **Light field** (`window.CobbLightField`) | One shared model of a single beam of light, with a position along the top edge, a direction, an intensity, a warmth (cold → neutral → warm) and a slow sway. Every other layer asks it how much light falls on a point (`sample(x, y)`) and what color that light is (`tint()`). |
| **Darkness mask** (`#lighting`) | A near-opaque dark layer whose transparency follows the light field. It's computed at 1/7 resolution and scaled up, and refreshed every 120 ms so the beam can sway. |
| **Dust** (`#haze`) | 180–1,100 tiny motes drifting on slow, overlapping air currents. They only show where the beam hits them, which makes the shaft of light visible. |
| **Webs** (`#stage canvas`) | The web generator and its silk physics (below). Each strand is lit by the light field at each end. |
| **Light switch** | A CSS-drawn wall plate. It's barely visible in the dark and brightens as the beam passes over it. Click, Enter, Space or Arrow Up turns it on. |
| **Bugs** | 8 small DOM bugs. When the light comes on, each one runs to its nearest screen edge, zigzagging, using the Web Animations API. |
| **Welcome card, flash, click sound** | A soft flicker when the light comes on, a short Web Audio click, then the welcome card. |

### The web generator

- **Seeded and repeatable:** a text seed (`COBB-0804`) is hashed (FNV-1a) into a
  small random number generator (mulberry32), so the same seed and settings
  always make the same webs.
- **Layout:** 2–7 webs placed from nine positions (corners, edges, center), each
  with jitter, a size, a squash and a depth (`z`) for layering.
- **Structure:** each web has a hub, radial spokes and capture silk. One of
  three spacing profiles (dense near the hub, dense near the edge, or banded)
  spaces the capture silk. Patches of fine filament are added, and 3–5 support
  threads tie each web to the screen edges.
- **Age:** the *structure* setting breaks strands in patches, so an old web looks
  worn rather than randomly holed. Broken strands leave short fragments
  hanging.
- **Days away** sets the number of webs, their density and their coverage, at
  full growth by 30 days.
- **Physics:** a light Verlet solver. Webs stay perfectly still until touched.
  The cursor catches silk and gathers it into a bundle, and fast swipes tear
  strands. A support thread under too much load snaps, and a connectivity check
  lets sections that lose their supports sag, swing or fall. Silk tears rather
  than stretching like rubber.
- **Generator panel (⚙):** seed, randomize, and sliders for layers, coverage,
  density, structure, variation, sag, clusters, thickness, light and silk color.
  Exports to transparent PNG (2x) and SVG, and copies the config as JSON.

### Accessibility and escape hatches

**Skip scene** and **Esc** close the overlay at any time. The switch is a
focusable button. With reduced motion, the flicker, the bugs and the light's
sway are off.

## Known issues and cleanup (do before anything else)

- **Two web engines in one file.** The older v0.6 engine (`#webs`, hidden) still
  builds webs on resize and runs its own pointer handling. Remove it.
- **Layered CSS from each version:** several `<style>` blocks override each other
  with `!important`. Merge them into one stylesheet.
- **Mismatched versions:** the page title says v0.5.3, the toolbar v0.6.2 and the
  generator v0.4.9. Pick one version.
- **"Days away" is a dropdown,** not real. The real overlay needs to remember the
  last visit (below).
- **Performance:**
  - The darkness mask is recomputed on the CPU pixel by pixel, calling
    `tint()` for every pixel.
  - Every strand creates a new canvas gradient every frame.
  - Dust radial gradients are created per mote.

  This is fine on a laptop and heavy on phones and for webs with many strands.

## Opportunities

### 1. Better, more varied and more realistic lighting

Today there is one beam with a single color.

- **More light sources and types:** window moonlight (today's beam), a doorway
  spill, a street lamp through blinds (bar shadows), a candle or lantern (a warm
  point light that flickers), a phone flashlight that follows the cursor
  (search the room before finding the switch).
- **Colors from cool to warm within a scene:** cool moonlight with a warm spill
  from a hallway. Let each light have its own color, so the tint is sampled per
  point instead of being one global color.
- **Light that changes over time:** clouds passing over the moon (slow dimming),
  blinds swaying, a flickering bulb, headlights sweeping across the room once.
- **Realistic falloff:** soft-edged beams that widen and fade with distance,
  window shapes with frame shadows cast into the beam, gentle bounce light so
  corners aren't pure black.
- **Silk that catches light:** brighter glints where a strand faces the light,
  edge highlights on strands in the beam, and a faint sparkle as webs move.
- **The "lights on" moment:** a fluorescent-tube flicker, a warm bulb glowing
  up, or a lamp; a short sequence rather than a single flash.
- **Presets:** "Moonlit attic", "Basement bulb", "Candle", "Streetlight
  blinds", "Flashlight", each a bundle of lights, colors and motion.
- **Performance:** move the darkness mask to a WebGL shader (or at least cache
  the light field and only update what moves). This makes several lights and
  per-light colors affordable.

### 2. A better spider web generator

- **More kinds of webs:**
  - orb webs (today's)
  - sheet and funnel webs in corners
  - tangled cobwebs (irregular 3D-looking messes along ceiling lines)
  - single drifting strands
  - webs strung between page elements
- **Webs that fit the page:** anchor them to real page elements (header corners,
  images, buttons) found with `getBoundingClientRect`, so the webs look built on
  *this* site instead of on the screen edges.
- **More natural construction:** a true spiral (one continuous thread) instead
  of rings, frame threads around the edge, a stabilimentum (the zigzag band) now
  and then, and drooping capture silk between spokes.
- **Dust and debris:** dust built up on old silk, a dead leaf or a trapped bug,
  an occasional spider (who could run away with the bugs).
- **Aging over time:** age as a continuous value, not only days away, with
  fresh silk at 1 week, dusty sagging silk at 3 months, and torn, heavy
  sheets at a year.
- **Better interaction:** silk that clings to the cursor and trails behind it,
  touch and pen support tuned for phones, and an optional "brush" sound.
- **Performance:** batch strands by brightness into a few paths instead of one
  gradient per strand, put the physics in a typed-array solver (or a Web
  Worker), and keep a strand budget per detail level so phones stay smooth.
- **Generator as a tool:** saved presets, shareable seed URLs, and a gallery of
  favorite seeds.

### 3. A standalone embed for any site (recommended first)

Goal: one script tag, with no build step and no changes to the host site.

```html
<script src="https://cdn.example.com/cobb-webs@1/cobb-webs.min.js"
        data-min-days="14"
        data-preset="moonlit-attic"
        data-silk="silver"
        data-message="It's been {days} days. We kept the lights off for you."
        defer></script>
```

- **Package:** one ES module plus a small auto-init script, published to npm and
  served from a CDN (jsDelivr or unpkg). Also usable from code:
  `CobbWebs.init({ ... })`, `CobbWebs.show()`, `CobbWebs.destroy()`.
- **Isolation:** render inside a Shadow DOM root, so the host site's CSS can't
  break the overlay and the overlay's CSS can't leak out. No global names other
  than `window.CobbWebs`.
- **Remember the last visit:** store the last-visit time in `localStorage`
  (per site) and show the overlay only when the visitor has been away at least
  `data-min-days`. Days away sets how grown-in the webs are. A first visit shows
  nothing (or a `data-first-visit` option).
- **Configuration through data attributes (with JS option equivalents):**

  | Attribute | Example | Meaning |
  | --- | --- | --- |
  | `data-min-days` | `14` | Days away before the overlay shows |
  | `data-preset` | `moonlit-attic` | Lighting and web preset |
  | `data-seed` | `COBB-0804` | Fixed webs instead of random ones |
  | `data-silk` | `silver`, `pearl`, `gold` | Silk color |
  | `data-detail` | `auto`, `low`, `high` | `auto` picks by device |
  | `data-message` / `data-button` | text with `{days}` | Welcome card copy |
  | `data-switch-position` | `right`, `left` | Where the switch sits |
  | `data-bugs` | `true` | Bugs when the light comes on |
  | `data-sound` | `false` | The click sound |
  | `data-theme` | `light`, `dark` | Welcome card style |
  | `data-test` | `true` | Always show the overlay (for previews) |

- **Events for site owners:** `cobbwebs:shown`, `cobbwebs:lit`,
  `cobbwebs:entered`, `cobbwebs:skipped`, for analytics.
- **Respect visitors:**
  - reduced motion off by default (a static, lit scene or nothing)
  - never show twice in a session
  - Esc and Skip always work
  - focus trapped in the card and returned to the page afterwards
  - no cookies and no network calls
- **Size budget:** aim for under 25 KB gzipped, lazy-loading the full engine
  only when the overlay will actually show.
- **Demo site:** a landing page with a live preview, a configurator that writes
  the script tag for you (the generator panel grows into this), and a "Try it"
  button that fakes a 127-day absence.

### 4. A Chrome extension (later)

The extension version shows Cobb Webs on *any* site you return to after a long
break. It's fun for personal use and as a demo, but it's a weaker way to share
the project than the embed: people have to install it, it needs broad
permissions, and site owners don't get to opt in.

- Reuse the embed package as a content script (Manifest V3), with last-visit
  times kept per domain in `chrome.storage.local`.
- Options page: minimum days away, preset, and lists of sites to always skip
  or always include.
- Ask for access only to sites the user picks (`activeTab` or optional host
  permissions) rather than all sites, which also makes Chrome Web Store review
  easier.
- Build it once the embed is stable, so both share one engine.

## Suggested order

1. **Clean up:** remove the old engine, merge the CSS, settle on one version.
2. **Split the file into modules:** light field, darkness mask, dust, web
   generator, physics, bugs, scene (switch and card), with one config object.
3. **Embed package:** Shadow DOM, last-visit tracking, data attributes, events,
   CDN build, demo page.
4. **Lighting:** several lights, a color per light, a WebGL mask, presets.
5. **Web generator:** new web types, webs anchored to page elements, aging,
   performance budget.
6. **Chrome extension** on top of the embed.
