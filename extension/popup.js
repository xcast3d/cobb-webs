import { isOn, originOf, resolveSettings, siteKey } from "./src/core.js";
import { renderSettings } from "./src/settings-form.js";

const $ = (id) => document.getElementById(id);
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const origin = originOf(tab?.url ?? "");
const key = origin && siteKey(origin);

async function load() {
  const stored = await chrome.storage.local.get(["defaults", key]);
  return { defaults: stored.defaults, site: stored[key] ?? {} };
}
/** Re-reads before writing: the content script updates visit times on every load. */
async function updateSite(change) {
  const { site } = await load();
  const next = change(site);
  await chrome.storage.local.set({ [key]: next });
  return next;
}

const plural = (n) => `${n} ${n === 1 ? "day" : "days"}`;
function describe(site, settings) {
  if (!isOn(site)) return "Off for this site. Visits here aren't recorded.";
  if (site.lastAway != null && site.previousVisit)
    return `You were last away for ${plural(site.lastAway)}. Webs appear after ${plural(settings.minDays)} away and are fully grown at ${settings.fullAt}.`;
  if (!site.lastVisit)
    return "No visits recorded yet. Reload the page to start remembering this site.";
  const since = new Date(site.lastVisit).toLocaleDateString();
  return `Remembering visits since ${since}. Stay away ${plural(settings.minDays)} or more to come back to cobwebs.`;
}

async function render() {
  const { defaults, site } = await load();
  const settings = resolveSettings(defaults, site);
  $("enabled").checked = isOn(site);
  $("status").textContent = describe(site, settings);
  $("reset").hidden = !site.settings || !Object.keys(site.settings).length;
  renderSettings($("settings"), settings, async (change) => {
    const next = await updateSite((s) => ({
      ...s,
      settings: { ...s.settings, ...change },
    }));
    $("reset").hidden = false;
    $("status").textContent = describe(next, resolveSettings(defaults, next));
  });
  if (!$("days").dataset.touched) {
    $("days").value = Math.max(
      settings.minDays,
      Math.min(365, site.lastAway || settings.fullAt),
    );
    $("days-out").value = plural(Number($("days").value));
  }
}

if (!origin) {
  $("unsupported").hidden = false;
  $("host").textContent = tab?.url
    ? new URL(tab.url).protocol.replace(":", "") + " page"
    : "";
  $("replay").disabled = true;
} else {
  $("host").textContent = new URL(origin).host;
  $("main").hidden = false;
  await render();

  $("enabled").addEventListener("change", async (event) => {
    const on = event.target.checked;
    // Visits aren't recorded while off, so counting starts fresh when turned back on.
    await updateSite(({ disabled, ...s }) =>
      on ? { ...s, lastVisit: Date.now() } : { ...s, disabled: true },
    );
    render();
  });

  $("reset").addEventListener("click", async () => {
    await updateSite(({ settings, ...s }) => s);
    render();
  });

  $("days").addEventListener("input", (event) => {
    event.target.dataset.touched = "1";
    $("days-out").value = plural(Number(event.target.value));
  });

  $("replay").addEventListener("click", async () => {
    const message = { type: "cobwebs:replay", days: Number($("days").value) };
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      // Tabs opened before the extension was installed have no content script yet.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["dist/content.js"],
      });
      await chrome.tabs.sendMessage(tab.id, message);
    }
    window.close();
  });
}
