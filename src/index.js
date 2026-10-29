import { createScene } from "./experience/scene.js";
import { visitDecision } from "./experience/visits.js";
import { createWebBug } from "./experience/web-bug.js";
export {
  WebEngine,
  generateWebs,
  SilkPhysics,
  SilkRenderer,
} from "./engine/index.js";
export { LightField } from "./lighting/light-field.js";
export { createScene };
let active = null;
let webBug = null;
let replayOptions = null;
function ensureWebBug() {
  if (webBug) return;
  webBug = createWebBug({
    update({ web, lighting }) {
      active?.updateWeb(web);
      active?.updateLight(lighting);
      replayOptions = {
        ...replayOptions,
        web: { ...replayOptions?.web, ...web },
        lighting: { ...replayOptions?.lighting, ...lighting },
      };
    },
    replay({ web, lighting }) {
      show({
        ...replayOptions,
        days: replayOptions.days,
        web: {
          ...replayOptions?.web,
          ...web,
          seed: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36),
        },
        lighting: { ...replayOptions?.lighting, ...lighting },
        cobwebsBug: true,
      });
    },
  });
}
export function destroy() {
  active?.destroy();
  active = null;
  webBug?.destroy();
  webBug = null;
  replayOptions = null;
}
export function show(options = {}) {
  active?.destroy();
  replayOptions = options;
  active = createScene({
    ...options,
    onDestroy() {
      active = null;
      options.onDestroy?.();
    },
  });
  if (options.cobwebsBug) ensureWebBug();
  return active;
}
export function init(options = {}) {
  let storage, session;
  try {
    storage = localStorage;
    session = sessionStorage;
  } catch {
    /* Storage may be blocked. */
  }
  const decision = visitDecision({ ...options, storage, session });
  const days =
    options.days ??
    (decision.days > 0 ? decision.days : (options.minDays ?? 14));
  replayOptions = { ...options, days };
  if (options.cobwebsBug) ensureWebBug();
  return options.always || decision.show ? show({ ...options, days }) : null;
}
// Classic script auto-init is opt-in; ES module users call init/show themselves.
const script = typeof document === "undefined" ? null : document.currentScript;
if (script?.hasAttribute("data-cobwebs")) {
  const d = script.dataset;
  const start = () =>
    init({
      minDays: Number(d.minDays ?? 14),
      test: d.test === "true",
      days: d.days ? Number(d.days) : undefined,
      preset: d.preset,
      always: d.always === "true",
      eyebrow: d.eyebrow,
      title: d.title,
      sentence: d.sentence,
      button: d.button,
      bugs: d.bugs !== "false",
      cobwebsBug: d.cobwebsBug === "true",
      web: { seed: d.seed, silk: d.silk },
    });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else queueMicrotask(start);
}
