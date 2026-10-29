import { createGenerator, controls } from "./index.js";
import "./style.css";
const app = document.querySelector("#generator-app");
app.innerHTML = `<header><div><strong>✳ Cobweb Generator</strong><span>SILK FOR YOUR ARTWORK</span></div><a href="./index.html">Welcome-back demo ↗</a></header><main><aside><h1>Spin something new.</h1><p>Seeded spider webs for illustration, compositing, and whatever you make next.</p><label>Seed<input id="seed" value="COBWEB-0804" spellcheck="false"></label><div class="row"><button id="random">New seed</button><button id="restore">Restore web</button></div><fieldset><legend>Artboard</legend><div class="row"><label>Width<input id="width" type="number" min="64" max="4096" step="1" value="1600"></label><label>Height<input id="height" type="number" min="64" max="4096" step="1" value="1200"></label></div><button id="resize">Apply dimensions</button></fieldset><div id="controls"></div><label>Silk tone<select id="silk"><option value="white">Pearl white</option><option value="silver">Moon silver</option><option value="gold">Aged gold</option></select></label><label>Preview background<select id="background"><option value="dark">Charcoal</option><option value="checker">Transparency grid</option></select></label><label class="check"><input id="physics" type="checkbox"> Brush and deform silk</label><p class="note">Drag to gather silk. Exports capture the current shape. Restore web returns to the original seed.</p><fieldset><legend>Export artwork</legend><div class="row"><button id="png">PNG · 2×</button><button id="svg">SVG · vector</button></div><button id="json">Save settings</button><p class="note">PNG and SVG have transparent backgrounds. The preview background is never exported. Settings reproduce the original web, not brush damage.</p></fieldset><output id="feedback" aria-live="polite"></output></aside><section class="workspace" aria-label="Artwork preview"><div class="artboard"><canvas aria-label="Generated spider web artwork"></canvas></div><p id="size-label"></p></section></main>`;
const $ = (id) => document.getElementById(id),
  canvas = app.querySelector("canvas"),
  board = app.querySelector(".artboard");
const generator = createGenerator(canvas, {
  layers: 1,
  coverage: 95,
  structure: 95,
  silk: "white",
});
for (const [key, label, min, max] of controls) {
  const row = document.createElement("label");
  row.className = "slider";
  row.innerHTML = `<span>${label}<output>${generator.config()[key]}</output></span><input type="range" min="${min}" max="${max}" value="${generator.config()[key]}">`;
  $("controls").append(row);
  row.querySelector("input").oninput = (e) => {
    row.querySelector("output").value = e.target.value;
    generator.generate({ [key]: Number(e.target.value) });
  };
}
function sizeLabel() {
  const c = generator.config();
  $("size-label").textContent =
    `${c.width} × ${c.height} · transparent artwork · PNG exports at ${c.width * 2} × ${c.height * 2}`;
  board.style.aspectRatio = `${c.width} / ${c.height}`;
}
$("resize").onclick = () => {
  try {
    generator.resize(Number($("width").value), Number($("height").value));
    sizeLabel();
    $("feedback").value = "Artboard resized.";
  } catch (error) {
    $("feedback").value = error.message;
  }
};
$("seed").onchange = (e) => generator.generate({ seed: e.target.value });
$("random").onclick = () => {
  $("seed").value = Math.random().toString(36).slice(2, 10).toUpperCase();
  generator.generate({ seed: $("seed").value });
};
$("restore").onclick = () => generator.generate();
$("silk").onchange = (e) => generator.generate({ silk: e.target.value });
$("background").onchange = (e) =>
  board.classList.toggle("checker", e.target.value === "checker");
let raf = 0,
  last = 0,
  drag = false;
function tick(time) {
  generator.frame(last ? Math.min(0.05, (time - last) / 1000) : 0);
  last = time;
  raf = requestAnimationFrame(tick);
}
function stop() {
  cancelAnimationFrame(raf);
  last = 0;
  drag = false;
  generator.release();
}
$("physics").onchange = (e) => {
  stop();
  generator.engine.config.physics = e.target.checked;
  if (e.target.checked && !document.hidden) raf = requestAnimationFrame(tick);
};
function pointer(e) {
  const r = canvas.getBoundingClientRect();
  generator.move(
    ((e.clientX - r.left) * canvas.width) / r.width,
    ((e.clientY - r.top) * canvas.height) / r.height,
    true,
  );
}
const abort = new AbortController();
canvas.addEventListener(
  "pointerdown",
  (e) => {
    if (!$("physics").checked) return;
    drag = true;
    generator.release();
    canvas.setPointerCapture(e.pointerId);
    pointer(e);
  },
  { signal: abort.signal },
);
canvas.addEventListener(
  "pointermove",
  (e) => {
    if (drag) pointer(e);
  },
  { signal: abort.signal },
);
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(
    type,
    () => {
      drag = false;
      generator.release();
    },
    { signal: abort.signal },
  );
document.addEventListener(
  "visibilitychange",
  () => {
    stop();
    if (!document.hidden && $("physics").checked)
      raf = requestAnimationFrame(tick);
  },
  { signal: abort.signal },
);
async function download(type) {
  try {
    const config = generator.config(),
      blob =
        type === "png"
          ? await generator.png()
          : new Blob(
              [
                type === "svg"
                  ? generator.svg()
                  : JSON.stringify(config, null, 2),
              ],
              { type: type === "svg" ? "image/svg+xml" : "application/json" },
            );
    if (!blob) throw Error("Image export failed. Try a smaller artboard.");
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `cobweb-${config.seed.replace(/[^a-z0-9_-]/gi, "_")}.${type}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("feedback").value = `${type.toUpperCase()} exported.`;
  } catch (error) {
    $("feedback").value = error.message;
  }
}
for (const type of ["png", "svg", "json"])
  $(type).onclick = () => download(type);
sizeLabel();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stop();
    abort.abort();
  });
