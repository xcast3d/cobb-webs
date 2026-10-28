import site from "./site.html?raw";
import "./studio.css";
import { createScene } from "../experience/scene.js";
import { controls, growthForDays } from "../engine/config.js";
import { presets } from "../lighting/light-field.js";

document.querySelector("#demo").innerHTML =
  `${site}<header class="studio-bar"><div class="studio-brand"><span class="mark">✳</span> Cobb Webs <small>STUDIO / 0.7</small></div><div class="studio-actions"><label>Days away <select id="days"><option>14</option><option>45</option><option selected>127</option><option>365</option></select></label><label>Detail <select id="detail"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></label><button id="replay">↻ Replay</button><button id="configure" aria-expanded="false" aria-controls="panel">Tune the scene <span>↗</span></button></div></header><aside id="panel" hidden><div class="panel-heading"><span>SCENE STUDIES</span><button id="close" aria-label="Close controls">×</button></div><h1>A room, left waiting.</h1><p class="intro">Shape the silk. Let a little light in.</p><div class="tabs"><button id="experience" class="selected">Welcome back</button><a href="./generator.html">Art generator ↗</a></div><label class="field">Lighting study<select id="preset"><option value="moonlit-attic">01 / Moonlit attic</option><option value="hallway-spill">02 / Hallway spill</option><option value="streetlight">03 / Streetlight</option></select></label><div class="section-label">01 — WEB STRUCTURE</div><label class="field">Seed<input id="seed" value="COBB-0804" spellcheck="false"></label><div class="button-row"><button id="random">New seed</button><button id="regenerate">Restore silk</button></div><div id="web-controls"></div><label class="field">Silk tone<select id="silk"><option value="silver">Moon silver</option><option value="white">Pearl white</option><option value="gold">Aged gold</option></select></label><label class="check"><input id="anchors" type="checkbox"> Show attachment points</label><label class="check"><input id="physics" type="checkbox" checked> Interactive silk</label><div class="section-label">02 — LIGHT & ATMOSPHERE</div><div id="light-controls"></div><label class="check"><input id="motion" type="checkbox" checked> Slow light movement</label><div class="section-label">03 — TAKE IT WITH YOU</div><div class="button-row"><button id="png">PNG</button><button id="svg">SVG</button><button id="copy">Copy config</button></div><output id="feedback" aria-live="polite"></output><p class="footnote">Drag to gather silk. Release to let it settle. Seed and settings stay the same on replay.</p></aside>`;
const $ = (id) => document.getElementById(id);
let scene,
  web = { seed: "COBB-0804", ...growthForDays(127) },
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
  ["warmth", "Moonlight warmth"],
  ["fill", "Warm spill"],
])
  slider(key, label, 0, 100, lighting[key], "light-controls", (v) => {
    lighting[key] = v;
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
$("configure").onclick = () => setPanel($("panel").hidden);
$("close").onclick = () => setPanel(false);
$("replay").onclick = refresh;
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
  a.download = `cobb-web-${web.seed}.${extension}`;
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
