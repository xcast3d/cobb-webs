import site from "./site.html?raw";
import "./studio.css";
import { createScene } from "../experience/scene.js";
import { controls, growthForDays } from "../engine/config.js";
import { presets } from "../lighting/light-field.js";

document.querySelector("#demo").innerHTML =
  `${site}<header class="studio-bar"><div class="studio-brand"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2h28M2 2v28M2 2l25 8M2 2l20 20M2 2l8 25"/><path d="M9 2q-.5 3-2 5T2 9M16 2q-1 7-4 10T2 16M23 2q-2 11-6 15T2 23"/><path d="M30 2q-3 16-10 20T2 30" opacity=".7"/></g></svg> Cobwebs <small>STUDIO / 0.7</small></div><button id="studio-menu" aria-expanded="false" aria-controls="studio-actions" aria-label="Open studio menu"><span></span><span></span><span></span></button><div class="studio-actions" id="studio-actions"><label>Days away <select id="days"><option>14</option><option>45</option><option selected>127</option><option>365</option></select></label><label>Detail <select id="detail"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></label><button id="replay">↻ Replay</button><button id="install">Add it to your site</button><button id="get-extension">Chrome extension</button><a class="github-link" href="https://github.com/xcast3d/cobwebs" target="_blank" rel="noopener noreferrer">View on GitHub</a><button id="configure" aria-expanded="false" aria-controls="panel">Tune the scene <span>↗</span></button></div></header><aside id="panel" hidden><div class="panel-heading"><span>SCENE STUDIES</span><button id="close" aria-label="Close controls">×</button></div><h1>A room, left waiting.</h1><p class="intro">Shape the silk. Let a little light in.</p><div class="tabs"><button id="experience" class="selected">Welcome back</button><a href="./generator.html">Art generator ↗</a></div><label class="field">Lighting study<select id="preset"><option value="moonlit-attic">01 / Moonlit attic</option><option value="hallway-spill">02 / Hallway spill</option><option value="streetlight">03 / Streetlight</option><option value="custom" disabled>Custom lighting</option></select></label><div class="section-label">01 — WEB STRUCTURE</div><label class="field">Seed<input id="seed" value="COBWEB-0804" spellcheck="false"></label><div class="button-row"><button id="random">New seed</button><button id="regenerate">Restore silk</button></div><div id="web-controls"></div><label class="field">Silk tone<select id="silk"><option value="light">Match lighting</option><option value="silver">Moon silver</option><option value="white">Pearl white</option><option value="gold">Aged gold</option></select></label><label class="check"><input id="anchors" type="checkbox"> Show attachment points</label><label class="check"><input id="physics" type="checkbox" checked> Interactive silk</label><div class="section-label">02 — LIGHT & ATMOSPHERE</div><div id="light-controls"></div><label class="check"><input id="motion" type="checkbox" checked> Slow light movement</label><div class="section-label">03 — TAKE IT WITH YOU</div><div class="button-row"><button id="png">PNG</button><button id="svg">SVG</button><button id="copy">Copy config</button></div><output id="feedback" aria-live="polite"></output><p class="footnote">Drag to gather silk. Release to let it settle. Replay creates fresh webs and lighting. Restore silk keeps your current settings.</p></aside><dialog id="install-dialog" aria-labelledby="install-title"><div class="install-heading"><div><span class="install-kicker">THE WELCOME-BACK EXPERIENCE</span><h2 id="install-title">Add Cobwebs to your site.</h2></div><button id="install-close" aria-label="Close installation instructions">×</button></div><p class="install-intro">Download one self-contained script, host it with your site, and add the silk, atmosphere, light switch, and welcome message without changing your page markup or styles.</p><ol class="install-steps"><li><strong>Download the script</strong><span>Upload it to your site's public assets folder.</span></li><li><strong>Update and add the code</strong><span>Replace example.com, then add it before <code>&lt;/body&gt;</code>.</span></li></ol><div class="install-code"><code id="embed-code">&lt;script src=&quot;https://example.com/assets/cobwebs.min.js&quot; data-cobwebs data-min-days=&quot;14&quot; data-cobwebs-bug=&quot;true&quot; defer&gt;&lt;/script&gt;</code><button id="copy-embed">Copy</button></div><output id="install-feedback" aria-live="polite"></output><div class="install-actions"><a id="download-embed" href="../embed/cobwebs.min.js" download="cobwebs.min.js">Download JavaScript</a><button id="install-done">Done</button></div><p class="install-note">Use <code>data-always=&quot;true&quot;</code> to show every time. Customize the card with <code>data-eyebrow</code>, <code>data-title</code>, <code>data-sentence</code>, and <code>data-button</code>. The web icon is optional; remove <code>data-cobwebs-bug=&quot;true&quot;</code> for no replay control. WordPress users should purge page and CDN caches after changing the embed.</p></dialog><dialog id="extension-dialog" class="install-dialog" aria-labelledby="extension-title"><div class="install-heading"><div><span class="install-kicker">FOR EVERY SITE YOU VISIT · CHROME</span><h2 id="extension-title">Cobwebs for your browser.</h2></div><button class="install-close" id="extension-close" aria-label="Close extension instructions">×</button></div><p class="install-intro">Every site you return to after a while gathers cobwebs, heavier the longer you've been away. Turn it off per site, tune it, or replay it from the toolbar button. Visit times stay on your computer.</p><ol class="install-steps extension-steps"><li><strong>Download and unzip</strong><span>Keep the unzipped folder somewhere permanent; Chrome loads it from there.</span></li><li><strong>Open chrome://extensions</strong><span>Paste it into the address bar and turn on <em>Developer mode</em>, top right.</span></li><li><strong>Load unpacked</strong><span>Choose the unzipped folder, then pin Cobwebs from the puzzle-piece menu.</span></li></ol><div class="install-actions"><a id="download-extension" href="./extension/cobwebs-extension.zip" download="cobwebs-extension.zip">Download extension (.zip)</a><button id="extension-done">Done</button></div><p class="install-note">Chrome will ask to read and change data on all websites; that's what lets the webs appear on any page. Cobwebs only stores when you last visited each site, locally, and never sends anything. A Chrome Web Store version is on its way.</p></dialog>`;
const $ = (id) => document.getElementById(id);
const embedDownloadUrl = new URL(
  import.meta.env.DEV ? "/dist/embed/cobwebs.min.js" : "./embed/cobwebs.min.js",
  location.href,
);
embedDownloadUrl.searchParams.set("v", __COBWEBS_BUILD_ID__);
$("download-embed").href = embedDownloadUrl;
let scene,
  web = { seed: "COBWEB-0804", silk: "light", ...growthForDays(127) },
  lighting = { ...presets["moonlit-attic"], motion: true };
function slider(id, label, min, max, value, parent, onChange) {
  const row = document.createElement("label");
  row.className = "slider";
  row.innerHTML = `<span>${label}<output>${Math.round(value)}</output></span><input id="${id}" type="range" min="${min}" max="${max}" value="${value}">`;
  $(parent).append(row);
  row.querySelector("input").addEventListener("input", (e) => {
    row.querySelector("output").value = e.target.value;
    onChange(Number(e.target.value));
  });
}
for (const [key, label, min, max, fallback] of controls) {
  web[key] ??= fallback;
  slider(key, label, min, max, web[key], "web-controls", (v) => {
    web[key] = v;
    scene?.updateWeb(web);
  });
}
for (const [key, label] of [
  ["position", "Window position"],
  ["direction", "Beam direction"],
  ["intensity", "Moonlight"],
  ["warmth", "Light color · icy / neutral / amber"],
  ["fill", "Warm spill"],
])
  slider(key, label, 0, 100, lighting[key], "light-controls", (v) => {
    lighting[key] = v;
    $("preset").value = "custom";
    scene?.updateLight(lighting);
  });
function refresh() {
  scene?.destroy();
  scene = createScene({
    days: Number($("days").value),
    detail: $("detail").value,
    web,
    lighting,
    allowExternalControls: true,
  });
}
function syncWeb() {
  for (const [key] of controls) {
    $(key).value = web[key];
    $(key).previousElementSibling.querySelector("output").value = Math.round(
      web[key],
    );
  }
}
function setPanel(open) {
  $("panel").hidden = !open;
  $("configure").setAttribute("aria-expanded", String(open));
}
function setStudioMenu(open) {
  $("studio-actions").classList.toggle("open", open);
  $("studio-menu").setAttribute("aria-expanded", String(open));
  $("studio-menu").setAttribute(
    "aria-label",
    open ? "Close studio menu" : "Open studio menu",
  );
}
$("studio-menu").onclick = () =>
  setStudioMenu(!$("studio-actions").classList.contains("open"));
// Choosing an action closes the collapsed menu so it doesn't cover the scene.
$("studio-actions").addEventListener("click", (event) => {
  if (event.target.closest("button, a")) setStudioMenu(false);
});
$("configure").onclick = () => setPanel($("panel").hidden);
$("close").onclick = () => setPanel(false);
const extensionDownloadUrl = new URL(
  import.meta.env.DEV
    ? "/dist/extension/cobwebs-extension.zip"
    : "./extension/cobwebs-extension.zip",
  location.href,
);
extensionDownloadUrl.searchParams.set("v", __COBWEBS_BUILD_ID__);
$("download-extension").href = extensionDownloadUrl;
const extensionDialog = $("extension-dialog");
$("get-extension").onclick = () => extensionDialog.showModal();
$("extension-close").onclick = $("extension-done").onclick = () =>
  extensionDialog.close();
extensionDialog.addEventListener("click", (event) => {
  if (event.target === extensionDialog) extensionDialog.close();
});
const installDialog = $("install-dialog");
$("install").onclick = () => installDialog.showModal();
$("install-close").onclick = $("install-done").onclick = () =>
  installDialog.close();
installDialog.addEventListener("click", (event) => {
  if (event.target === installDialog) installDialog.close();
});
$("copy-embed").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("embed-code").textContent);
    $("install-feedback").value = "Installation code copied.";
    $("copy-embed").textContent = "Copied";
  } catch {
    $("install-feedback").value = "Select the code above to copy it.";
  }
};
$("replay").onclick = () => {
  const randomInt = (min, max) =>
    Math.floor(min + Math.random() * (max - min + 1));
  web = {
    seed: crypto.randomUUID().slice(0, 8).toUpperCase(),
    silk: "light",
    physics: true,
    anchors: false,
  };
  for (const [key, , min, max] of controls) web[key] = randomInt(min, max);
  lighting = {
    position: randomInt(10, 90),
    direction: randomInt(15, 85),
    intensity: randomInt(55, 100),
    warmth: randomInt(0, 100),
    fill: randomInt(8, 65),
    motion: true,
  };
  syncWeb();
  $("seed").value = web.seed;
  $("silk").value = web.silk;
  $("physics").checked = true;
  $("anchors").checked = false;
  $("motion").checked = true;
  $("preset").value = "custom";
  for (const key of ["position", "direction", "intensity", "warmth", "fill"]) {
    $(key).value = lighting[key];
    $(key).previousElementSibling.querySelector("output").value = lighting[key];
  }
  refresh();
};
$("regenerate").onclick = () => scene.updateWeb(web);
$("random").onclick = () => {
  web.seed = Math.random().toString(36).slice(2, 10).toUpperCase();
  $("seed").value = web.seed;
  scene.updateWeb(web);
};
$("seed").onchange = (e) => {
  web.seed = e.target.value;
  scene.updateWeb(web);
};
for (const key of ["silk", "anchors", "physics"])
  $(key).onchange = (e) => {
    web[key] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    scene.updateWeb(web);
  };
$("motion").onchange = (e) => {
  lighting.motion = e.target.checked;
  scene.updateLight(lighting);
};
$("preset").onchange = (e) => {
  lighting = { ...lighting, ...presets[e.target.value] };
  for (const key of Object.keys(presets[e.target.value])) {
    $(key).value = lighting[key];
    $(key).previousElementSibling.querySelector("output").value = lighting[key];
  }
  scene.updateLight(lighting);
};
for (const key of ["days", "detail"])
  $(key).onchange = () => {
    web = {
      ...web,
      ...growthForDays(Number($("days").value), $("detail").value),
    };
    syncWeb();
    refresh();
  };
function download(blob, extension) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `cobweb-${web.seed}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("png").onclick = async () => {
  const blob = await scene.engine.png();
  if (blob) download(blob, "png");
};
$("svg").onclick = () =>
  download(new Blob([scene.engine.svg()], { type: "image/svg+xml" }), "svg");
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(
      JSON.stringify({ days: Number($("days").value), web, lighting }, null, 2),
    );
    $("feedback").value = "Configuration copied.";
  } catch {
    $("feedback").value = "Clipboard unavailable in this browser.";
  }
};
refresh();
if (import.meta.hot) import.meta.hot.dispose(() => scene?.destroy());
