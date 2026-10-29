import { clamp } from "./math.js";
export const controls = [
  ["layers", "Layers", 1, 7, 4],
  ["coverage", "Coverage", 10, 100, 78],
  ["density", "Density", 10, 100, 65],
  ["structure", "Preservation", 0, 100, 82],
  ["variation", "Organic variation", 0, 100, 70],
  ["sag", "Silk slack", 0, 100, 42],
  ["clusters", "Fine filaments", 0, 100, 55],
  ["thickness", "Silk thickness", 0, 100, 42],
];
export function normalizeConfig(input = {}) {
  const config = {
    seed: String(input.seed ?? "COBWEB-0804"),
    silk: ["light", "silver", "white", "gold"].includes(input.silk)
      ? input.silk
      : "silver",
    physics: input.physics !== false,
    anchors: !!input.anchors,
  };
  for (const [key, , min, max, fallback] of controls) {
    const n = Number(input[key] ?? fallback);
    config[key] = clamp(Number.isFinite(n) ? n : fallback, min, max);
  }
  config.layers = Math.round(config.layers);
  return config;
}
const shapes = {
  linear: (t) => t,
  ease: (t) => t * t * (3 - 2 * t),
  log: (t) => Math.log1p(9 * t) / Math.log(10),
};
/**
 * Maps days away to web growth. `curve` tunes how fast webs grow in:
 * `startDays` (growth begins), `fullAt` (fully grown), `shape` and `scale`.
 * `layered` also thickens, slackens and fills in silk as days pass. With no
 * curve the result matches the original 90-day mapping.
 */
export function growthForDays(days = 127, detail = "medium", curve = {}) {
  const {
    startDays = 1,
    fullAt = 90,
    shape = "linear",
    scale = 1,
    layered = false,
  } = curve;
  const t = clamp((days - startDays) / Math.max(1, fullAt - startDays), 0, 1);
  const growth = clamp((shapes[shape] ?? shapes.linear)(t) * scale, 0, 1);
  const cap = detail === "low" ? 3 : detail === "high" ? 7 : 5;
  const result = {
    layers: Math.min(cap, Math.round(2 + growth * 4)),
    density: Math.min(
      detail === "low" ? 45 : detail === "high" ? 90 : 70,
      30 + growth * 55,
    ),
    coverage: 40 + growth * 45,
    structure: 95 - Math.min(35, (days / 14) * (90 / fullAt) * scale),
  };
  if (layered)
    Object.assign(result, {
      layers: Math.min(cap, Math.round(2 + growth * (cap - 1))),
      sag: 28 + growth * 40,
      clusters: 35 + growth * 55,
      thickness: 34 + growth * 26,
    });
  return result;
}
