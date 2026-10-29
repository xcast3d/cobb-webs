const styles = `
  :host { all: initial; position: fixed !important; right: 18px; bottom: 18px; z-index: 2147482999 !important; display: block !important; visibility: visible !important; opacity: 1 !important; color-scheme: dark; font: 13px/1.4 system-ui, sans-serif; color: #e4e9ee; }
  * { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  button:focus-visible, input:focus-visible { outline: 2px solid #f4d495; outline-offset: 3px; }
  .launcher { width: 44px; height: 44px; border: 1px solid #aab8c633; border-radius: 50%; background: #111923dd; color: #dce5ed; box-shadow: 0 8px 28px #0007; font-size: 21px; line-height: 1; }
  .launcher:hover { background: #1c2a36; transform: translateY(-1px); }
  .panel { position: absolute; right: 0; bottom: 54px; width: min(280px, calc(100vw - 36px)); padding: 18px; border: 1px solid #aab8c633; border-radius: 14px; background: #111923f5; box-shadow: 0 18px 60px #0009; backdrop-filter: blur(14px); }
  [hidden] { display: none; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 14px; font-weight: 650; letter-spacing: .02em; }
  .close { border: 0; background: transparent; color: #aeb9c4; font-size: 20px; padding: 0 3px; }
  label { display: block; margin: 12px 0; color: #b9c3cd; }
  label span { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  input[type=range] { width: 100%; accent-color: #d9c796; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 12px; text-transform: none; letter-spacing: 0; }
  .check input { accent-color: #d9c796; }
  .replay { width: 100%; margin-top: 6px; border: 0; border-radius: 8px; padding: 10px 14px; background: #e8e2d4; color: #25333d; font-weight: 650; }
  .site-link { display: block; margin-top: 8px; border: 1px solid #aab8c633; border-radius: 8px; padding: 9px 14px; color: #cbd5dd; text-align: center; text-decoration: none; font-size: 11px; }
  .site-link:hover { border-color: #aab8c666; color: #fff; }
  .note { margin: 10px 0 0; color: #8593a0; font-size: 10px; }
  @media (prefers-reduced-motion: reduce) { .launcher { transition: none; } .motion-row { display: none; } }
`;

export function createWebBug({ replay, update } = {}) {
  const host = document.createElement("cobwebs-bug");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${styles}</style><div class="panel" id="panel" hidden><header><h2>Cobwebs</h2><button class="close" aria-label="Close settings">×</button></header><label><span>Web density <output id="density-out">65</output></span><input id="density" aria-label="Web density" type="range" min="25" max="100" value="65"></label><label><span>Light level <output id="light-out">85</output></span><input id="light" aria-label="Light level" type="range" min="30" max="100" value="85"></label><label class="check"><input id="physics" type="checkbox" checked> Interactive silk</label><label class="check motion-row"><input id="motion" type="checkbox" checked> Slow light movement</label><button class="replay">↻ Replay cobwebs</button><a class="site-link" href="https://xcast3d.com/cobwebs/" target="_blank" rel="noopener noreferrer">Add to my site ↗</a><p class="note">Settings apply to this page only.</p></div><button class="launcher" aria-label="Open Cobwebs settings" aria-expanded="false" aria-controls="panel">🕸</button>`;
  document.body.append(host);
  const panel = root.querySelector(".panel"),
    launcher = root.querySelector(".launcher"),
    density = root.querySelector("#density"),
    light = root.querySelector("#light"),
    physics = root.querySelector("#physics"),
    motion = root.querySelector("#motion");
  const values = () => ({
    web: { density: Number(density.value), physics: physics.checked },
    lighting: { intensity: Number(light.value), motion: motion.checked },
  });
  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) root.querySelector(".close").focus();
  };
  launcher.addEventListener("click", () => setOpen(panel.hidden));
  root.querySelector(".close").addEventListener("click", () => {
    setOpen(false);
    launcher.focus();
  });
  for (const input of [density, light, physics, motion])
    input.addEventListener("input", () => {
      root.querySelector("#density-out").value = density.value;
      root.querySelector("#light-out").value = light.value;
      update?.(values());
    });
  root.querySelector(".replay").addEventListener("click", () => {
    setOpen(false);
    replay?.(values());
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.stopPropagation();
      setOpen(false);
      launcher.focus();
    }
  });
  return { host, destroy: () => host.remove(), values };
}
