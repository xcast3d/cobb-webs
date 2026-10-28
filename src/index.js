import { createScene } from "./experience/scene.js";
import { visitDecision } from "./experience/visits.js";
export {
  WebEngine,
  generateWebs,
  SilkPhysics,
  SilkRenderer,
} from "./engine/index.js";
export { LightField } from "./lighting/light-field.js";
export { createScene };
let active = null;
export function destroy() {
  active?.destroy();
  active = null;
}
export function show(options = {}) {
  destroy();
  active = createScene(options);
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
  return decision.show
    ? show({ ...options, days: options.days ?? decision.days })
    : null;
}
// Classic script auto-init is opt-in; ES module users call init/show themselves.
const script = typeof document === "undefined" ? null : document.currentScript;
if (script?.hasAttribute("data-cobb-webs")) {
  const d = script.dataset;
  const start = () =>
    init({
      minDays: Number(d.minDays ?? 14),
      test: d.test === "true",
      days: d.days ? Number(d.days) : undefined,
      preset: d.preset,
      message: d.message,
      button: d.button,
      bugs: d.bugs !== "false",
      web: { seed: d.seed, silk: d.silk },
    });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else queueMicrotask(start);
}
