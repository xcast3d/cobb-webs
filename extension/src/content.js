import { createScene } from "../../src/experience/scene.js";
import {
  isOn,
  originOf,
  recordVisit,
  resolveSettings,
  sceneOptions,
  shouldShow,
  siteKey,
} from "./core.js";

// Registered scripts and popup injections share one isolated world; run once.
if (!globalThis.__cobwebsExtension) {
  globalThis.__cobwebsExtension = true;
  let active = null;
  const origin = originOf(location.href);
  const detail = (navigator.hardwareConcurrency ?? 4) >= 8 ? "high" : "medium";

  async function settingsFor() {
    const key = siteKey(origin);
    const stored = await chrome.storage.local.get(["defaults", key]);
    return {
      key,
      site: stored[key],
      settings: resolveSettings(stored.defaults, stored[key]),
    };
  }

  function show(settings, days) {
    active?.destroy();
    active = createScene({
      ...sceneOptions(settings, days, detail),
      onDestroy() {
        active = null;
      },
    });
  }

  async function onLoad() {
    const { key, site, settings } = await settingsFor();
    if (!isOn(site)) return;
    const visit = recordVisit(site);
    await chrome.storage.local.set({ [key]: visit.site });
    if (shouldShow(visit, settings) && window === window.top)
      show(settings, visit.days);
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type !== "cobwebs:replay") return;
    settingsFor().then(({ settings }) => {
      show({ ...settings, ...message.settings }, message.days);
      reply({ ok: true });
    });
    return true;
  });

  if (origin) onLoad();
}
