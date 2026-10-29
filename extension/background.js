import { DEFAULTS, MAX_SITES, sitesToForget } from "./src/core.js";

chrome.runtime.onInstalled.addListener(async () => {
  const { defaults } = await chrome.storage.local.get("defaults");
  if (!defaults) await chrome.storage.local.set({ defaults: DEFAULTS });
});

/** Every site visited gets a record; keep storage bounded. */
chrome.runtime.onStartup.addListener(async () => {
  const stale = sitesToForget(await chrome.storage.local.get(null), MAX_SITES);
  if (stale.length) await chrome.storage.local.remove(stale);
});
