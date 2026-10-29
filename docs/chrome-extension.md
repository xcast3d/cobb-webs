# Cobwebs Chrome extension: plan

Status: phases 1–5 and 7 implemented, unpacked extension working (2026-10-29). This file is the working plan for
the extension. It expands section 4 of [PLAN.md](../PLAN.md) and should be kept
up to date as work progresses (see the checklist at the end).

## Goal

A Manifest V3 Chrome extension that shows the Cobwebs return experience on
every site by default; the user turns it off for specific sites. It remembers when each site was last visited, and the
longer the user has been away, the more layered and heavy the webs are, growing
day by day. The user configures each site from the extension popup, can replay
the scene on the current site, and can follow a link to
`https://xcast3d.com/cobwebs/` to add Cobwebs to their own website.

**UI rule:** all controls live in the extension's toolbar popup, like other
Chrome extensions. Apart from the welcome experience itself (the overlay that
appears and is dismissed), the extension adds nothing to the page: no in-page
web bug, launcher, badge or floating button.

## What already exists (reuse, don't duplicate)

| Piece                       | Where                                                     | Notes for the extension                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `show(options)`             | [src/index.js](../src/index.js)                           | Renders the scene in Shadow DOM. The extension should call this directly.                                                                                                            |
| `init(options)`             | [src/index.js](../src/index.js)                           | Reads the host page's `localStorage`. The extension must **not** use it; visit tracking moves to `chrome.storage`.                                                                   |
| `visitDecision()`           | [src/experience/visits.js](../src/experience/visits.js)   | Pure and storage-injected. Can be reused with an adapter, or its day math reused in the content script.                                                                              |
| `growthForDays(days)`       | [src/engine/config.js](../src/engine/config.js)           | Maps days away to web growth. Currently saturates at 90 days (`(days - 1) / 89`); `structure` stops changing at ~490 days.                                                           |
| Web bug (settings + replay) | [src/experience/web-bug.js](../src/experience/web-bug.js) | **Not used by the extension.** Its controls (density/light sliders, Replay, "Add to my site ↗") are rebuilt in the popup instead. Use it as a reference for which settings to offer. |
| Embed build                 | [vite.embed.config.js](../vite.embed.config.js)           | Builds `dist/embed/cobwebs.min.js` (IIFE, `window.Cobwebs`). Basis for the extension's bundled script.                                                                               |

## Phase 1: shared engine changes (do first)

These benefit the embed too and keep one engine for both products.

1. **Configurable heaviness curve.** Extend `growthForDays(days, detail, curve)`
   with options such as:
   - `fullAt` — days until full growth (default 90 to keep current behavior)
   - `shape` — `"linear" | "ease" | "log"`
   - `minDays` — days at which growth starts from zero

   Add unit tests in `tests/` for the mapping at 0, `minDays`, `fullAt`, and
   beyond.

2. **More layers over time.** "Heavier every day" should mean more than
   density: more webs, deeper `z` layering, more dust, more sag and more broken
   structure. Add a `layers` / `maxLayers` growth input so heaviness keeps
   accumulating after coverage saturates.
3. **Entry point without auto-init side effects.** Ensure the extension can load
   the bundle and call `Cobwebs.show({ days, web, lighting })` without the
   `data-cobwebs` auto-init or `init()` touching the host page's storage, and
   without creating the web bug (`cobwebsBug` must stay off).
4. **Extension build config.** `vite.extension.config.js` that outputs the IIFE
   to `extension/dist/cobwebs.js`, plus an `npm run build:extension` script
   (and include it in `npm run build`).

## Phase 2: extension skeleton

Folder layout:

```
extension/
  manifest.json
  background.js        # service worker
  content.js           # per-page logic, calls window.Cobwebs.show
  popup.html / popup.js / popup.css
  options.html / options.js   # global defaults, skip/include lists
  icons/               # 16, 32, 48, 128
  dist/cobwebs.js      # built from src/ (Phase 1, step 4); not hand-edited
```

### manifest.json (sketch)

```json
{
  "manifest_version": 3,
  "name": "Cobwebs",
  "version": "0.1.0",
  "description": "Sites you haven't visited in a while gather cobwebs.",
  "permissions": ["storage", "activeTab", "scripting"],
  "optional_host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "icons": { "128": "icons/128.png" }
}
```

Use **optional host permissions** granted per site from the popup
(`chrome.permissions.request({ origins: [origin + "/*"] })`) instead of
requesting all sites at install. This avoids the "read and change all your
data" warning and makes Chrome Web Store review easier.

### Injection

- When a site is enabled, register a dynamic content script for that origin
  with `chrome.scripting.registerContentScripts` (persists across sessions;
  `runAt: "document_idle"`). Unregister when disabled.
- Inject `dist/cobwebs.js` then `content.js` (both in the isolated world;
  `window.Cobwebs` lives in the isolated world, which is fine because the
  scene only needs the DOM).

## Phase 3: visit tracking

Storage (`chrome.storage.local`), keyed by origin:

```js
{
  defaults: { minDays: 3, fullAt: 30, shape: "ease", preset, silk, density, light, bugs: true },
  sites: {
    "https://example.com": {
      enabled: true,
      lastVisit: 1761700000000,
      lastShown: 1761700000000,
      // per-site overrides of any defaults key
      minDays: 1, fullAt: 14, shape: "linear", density: 80
    }
  },
  skip: ["https://mybank.com"]
}
```

Content script flow:

1. Read site settings merged over defaults. Stop if not enabled or in `skip`.
2. Compute `days = floor((now - lastVisit) / DAY)`.
3. **Session grouping:** page loads within ~30 minutes of `lastVisit` count as
   the same visit (so opening a second tab doesn't reset the counter or replay
   the scene). Also keep a `sessionStorage` "shown" flag like `visitDecision`.
4. If `days >= minDays`, call `Cobwebs.show({ days, curve, web, lighting, bugs })`
   (never with `cobwebsBug: true`).
5. Write `lastVisit = now` (and `lastShown` if shown).
6. First visit to a newly enabled site: record `lastVisit`, show nothing.

## Phase 4: popup (current tab's site)

- Site name and favicon; **Enable on this site** toggle (requests host
  permission for that origin).
- "Last visited N days ago" and a preview of how heavy the webs will be next
  time.
- Per-site controls:
  - Minimum days away before showing
  - Days until fully overgrown (`fullAt`)
  - Growth curve (linear / ease / log)
  - Web density, light level, silk color, bugs on/off
  - "Use defaults" reset
- **Replay on this site** button: `chrome.tabs.sendMessage(tabId, { type: "replay", days })`;
  the content script calls `Cobwebs.show(...)`. Include a "simulate N days"
  slider so each heaviness level can be previewed.
- **Add Cobwebs to your website ↗** link to
  `https://xcast3d.com/cobwebs/?ref=extension` (opens in a new tab).
- Link to the options page.

Options page: global defaults (same controls), always-skip list, and a
"forget all visit history" button.

## Phase 5: no in-page UI (decided)

The in-page web bug is **not** part of the extension. Everything outside the
welcome experience happens in the toolbar popup (Phase 4):

- Replay is triggered from the popup via `chrome.tabs.sendMessage`.
- Settings are saved from the popup straight to `chrome.storage.local`.
- The content script injects nothing until the welcome experience shows, and
  removes everything when it is dismissed (`Cobwebs.destroy()`).
- Add a test that a page with the extension enabled, but below `minDays`, has
  no extra DOM nodes.

## Phase 6: hardening

- Respect `prefers-reduced-motion` (already handled by the scene; verify).
- Never run on `chrome://`, `chrome-extension://`, the Chrome Web Store, PDFs
  or `file://` (Chrome blocks most of these; guard anyway).
- Ship a default skip list suggestion (banking, email) and an easy per-site
  off switch.
- Check stacking against sites with their own full-screen overlays and high
  z-index; confirm Esc / Skip always work and focus returns to the page.
- Check CSP-strict sites (the isolated world should be unaffected; verify
  canvas and Web Animations still work).
- Performance budget on heavy pages; use `detail: "auto"`.

## Phase 7: testing

- Unit tests (`node --test`): heaviness curve, session grouping, settings
  merge.
- Playwright with the unpacked extension
  (`chromium.launchPersistentContext` with `--load-extension`): enable a test
  site, fake `lastVisit` N days ago in storage, reload, assert the overlay
  appears and that heaviness increases with N; test Replay from the popup.

## Phase 8: release

### Manual install (done)

`npm run build` (or `npm run build:extension && npm run pack:extension`)
writes `dist/extension/cobwebs-extension.zip` (~48 KB) with
`scripts/pack-extension.js`, a dependency-free zip writer. The demo's
**Chrome extension** button opens a dialog with the download and three steps:
unzip, open `chrome://extensions` with Developer mode, Load unpacked. Deploying
`dist/` to xcast3d.com/cobwebs/ publishes the zip at
`/cobwebs/extension/cobwebs-extension.zip`. Unpacked installs don't
auto-update; users re-download and press reload. Chrome doesn't allow
installing `.crx` files from outside the store, so the zip is the only manual
route. The zip can also be attached to GitHub Releases.

### Chrome Web Store checklist

1. **Developer account:** register at the Chrome Web Store Developer Dashboard
   (one-time US$5 fee, 2-step verification required, verified contact email).
   Declare trader / non-trader status (EU requirement).
2. **Before submitting:**
   - Phase 6 hardening and manual testing on real sites.
   - Bump `version` in `extension/manifest.json` for every upload.
   - Privacy policy page, e.g. `xcast3d.com/cobwebs/privacy`: stores each
     site's address and last-visit time in `chrome.storage.local` only; no
     network requests, analytics or sharing; how to clear (options page /
     uninstall).
3. **Store listing assets:** 128×128 icon (have), at least one 1280×800
   screenshot (scene on a site, popup, options), a 440×280 small promo tile,
   description, category (Fun), and a link to `https://xcast3d.com/cobwebs/`.
4. **Privacy tab:**
   - Single purpose: "Shows a cobweb-covered welcome-back scene on websites
     you return to after time away."
   - Permission justifications: `storage` (per-site visit times and
     settings), `scripting` (replay on tabs opened before install), host
     access for all sites (needed to show the scene on any site and record
     visits; nothing is read from page content).
   - Remote code: none (everything is bundled).
   - Data use: disclose web history handling truthfully and certify it never
     leaves the device and isn't sold or used for unrelated purposes.
5. **Submit:** upload the zip and choose visibility. Starting **unlisted**
   (link only) is a good first step. Broad host access triggers an in-depth
   review: plan for several days to a few weeks, and quote the justifications
   above in review replies.
6. **After approval:** replace the demo dialog's manual steps with an "Add to
   Chrome" store link (keep the zip as a fallback). Updates: bump version,
   upload, review again; installed users update automatically.

## Open questions

- Track by origin (`https://www.example.com`) or registrable domain
  (`example.com`, so subdomains share a counter)? Default: origin.
- Should "heavier every day" keep growing forever, or cap (e.g. one year)?
- Should the extension's welcome card copy be editable per site?
- Should time spent on the site matter, or only the gap between visits?

## Decision: on everywhere, one install-time permission (2026-10-29)

The first build asked for access one site at a time (optional host
permissions). Manual testing showed three problems:

- Chrome's prompt says "Read and change your data on <site>". The wording is
  fixed by Chrome; there is no narrower "only track visit times" permission.
- Chrome's permission dialog closes the popup, so the popup never saved
  "on" and the user had to toggle twice.
- Nobody will approve sites one by one for a fun extension.

There is no way to draw on a page automatically without host access, so the
extension now asks once, at install, for all http/https sites (the same model
as Dark Reader or Grammarly): a static content script on every page, **on by
default**, with a per-site off switch in the popup. The install warning is
"Read and change all your data on all websites"; the Web Store listing and
privacy policy must explain that the extension only stores each site's
last-visit time, locally, and never makes network requests. Broad host access
means a longer, in-depth Web Store review.

Rejected alternatives: `history` permission (still a warning, and still needs
host access to draw); `activeTab` only (no prompt, but the scene could only
appear after clicking the toolbar button). Possible later addition: an
_optional_ `history` permission to backfill last-visit dates from existing
browser history, so cobwebs work on day one.

## As built (2026-10-29)

Differences from the plan above, and where things live:

- `growthForDays(days, detail, curve)` in `src/engine/config.js` takes
  `{ startDays, fullAt, shape: "linear" | "ease" | "log", scale, layered }`.
  `layered` also grows layers (up to the detail cap), sag, fine filaments and
  thickness. No curve means the original 90-day mapping.
- The content script bundles `createScene` directly (not `src/index.js`), so
  the web bug and auto-init are never included. Built by
  `vite.extension.config.js` to `extension/dist/content.js` (~12 KB gzip,
  git-ignored).
- Pure logic in `extension/src/core.js`: settings defaults, origin checks,
  `isOn`, `recordVisit` (30-minute visit gap), `shouldShow`, `sceneOptions`,
  `forgetVisits`, `sitesToForget` (20,000-site storage cap, applied on browser
  startup by `background.js`; never drops sites with choices).
- Manifest: `storage` + `scripting`, `host_permissions` for http/https, and a
  static `content_scripts` entry (Chrome Web Store excluded). No dynamic
  registration.
- Storage: one key per site (`site:<origin>`) instead of a nested `sites`
  object, so concurrent tabs don't overwrite each other; `defaults` key for
  global settings. Site records: `disabled` (only when turned off), `lastVisit`,
  `previousVisit`, `lastAway`, `settings` (partial overrides). Every visited
  site gets a record.
- Turning a site off stops recording there. Turning it back on resets
  `lastVisit` to now.
- Popup settings: show after (1–60 days), fully overgrown at (7–365), heaviness
  (50–150%), light level, growth shape, silk, bugs, interactive silk, plus a
  "Use defaults" reset. Replay has a "pretend I've been away" slider and works
  on any page, including sites that are off and tabs opened before install
  (it injects the content script if needed).
- The options page has the global defaults, the number of sites remembered,
  the list of sites turned off (with "Turn on"), and "Forget all visit
  history" (keeps on/off choices and settings).
- Host-page CSS: Reddit hides every unregistered custom element with
  `:not(:defined) { visibility: hidden }`, which hid `<cobwebs-scene>`.
  `customElements` is unavailable in content scripts, so the element can't be
  registered; instead the scene's `:host` marks position, display, visibility,
  opacity, transform and pointer-events `!important` (shadow `!important` wins
  over page rules). Covered by a "hostile CSS" browser test.
- Icons generated as PNGs (16/32/48/128) in `extension/icons/`.

## Checklist

- [x] Phase 1: configurable curve, layers, side-effect-free entry, extension build
- [x] Phase 2: manifest, background, content script (now static, on everywhere)
- [x] Phase 3: visit tracking in `chrome.storage.local`
- [x] Phase 4: popup and options page
- [x] Phase 5: decided — no in-page UI; popup only
- [ ] Phase 6: hardening (needs manual testing on real sites)
- [x] Phase 7: tests (`tests/extension.test.js`, `tests/browser/extension.spec.js`)
- [ ] Phase 8: release (manual zip + demo dialog done; Web Store pending)
