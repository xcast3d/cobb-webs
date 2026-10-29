import { forgetVisits, resolveSettings } from "./src/core.js";
import { renderSettings } from "./src/settings-form.js";

const $ = (id) => document.getElementById(id);

async function render() {
  const stored = await chrome.storage.local.get(null);
  renderSettings(
    $("settings"),
    resolveSettings(stored.defaults),
    async (change) => {
      const { defaults } = await chrome.storage.local.get("defaults");
      await chrome.storage.local.set({ defaults: { ...defaults, ...change } });
    },
  );
  const sites = Object.entries(stored).filter(([k]) => k.startsWith("site:"));
  const off = sites.filter(([, site]) => site?.disabled);
  $("sites").textContent =
    `On for every site. Remembering visits to ${sites.length - off.length} ${sites.length - off.length === 1 ? "site" : "sites"}, on this device only. ` +
    (off.length
      ? "Turned off for:"
      : "Turn it off for a site from the toolbar popup.");
  $("off-list").replaceChildren(
    ...off.map(([key]) => {
      const item = document.createElement("li"),
        button = document.createElement("button");
      item.textContent = new URL(key.slice(5)).host;
      button.className = "link-button";
      button.textContent = "Turn on";
      button.addEventListener("click", async () => {
        const { [key]: site } = await chrome.storage.local.get(key);
        const { disabled, ...rest } = site;
        await chrome.storage.local.set({ [key]: rest });
        render();
      });
      item.append(button);
      return item;
    }),
  );
}

$("forget").addEventListener("click", async () => {
  if (
    !confirm(
      "Forget when you last visited every site? Sites you turned off stay off.",
    )
  )
    return;
  const stored = await chrome.storage.local.get(null);
  const updates = {},
    removed = [];
  for (const [k, site] of Object.entries(stored))
    if (k.startsWith("site:")) {
      const rest = forgetVisits(site);
      if (Object.keys(rest).length) updates[k] = rest;
      else removed.push(k);
    }
  await chrome.storage.local.remove(removed);
  await chrome.storage.local.set(updates);
  render();
});

render();
