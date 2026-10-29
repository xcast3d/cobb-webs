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
    seed: String(input.seed ?? "COBB-0804"),
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
export function growthForDays(days = 127, detail = "medium") {
  const growth = clamp((days - 1) / 89, 0, 1);
  const cap = detail === "low" ? 3 : detail === "high" ? 7 : 5;
  return {
    layers: Math.min(cap, Math.round(2 + growth * 4)),
    density: Math.min(
      detail === "low" ? 45 : detail === "high" ? 90 : 70,
      30 + growth * 55,
    ),
    coverage: 40 + growth * 45,
    structure: 95 - Math.min(35, days / 14),
  };
}
