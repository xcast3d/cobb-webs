import { clamp, mix } from "../engine/math.js";
export const presets = {
  "moonlit-attic": {
    warmth: 18,
    intensity: 85,
    fill: 24,
    position: 23,
    direction: 34,
  },
  "hallway-spill": {
    warmth: 30,
    intensity: 65,
    fill: 68,
    position: 17,
    direction: 48,
  },
  streetlight: {
    warmth: 85,
    intensity: 90,
    fill: 12,
    position: 72,
    direction: 68,
  },
};
/** Shared world-space lighting, evaluated once into a small reusable color grid. */
export class LightField {
  constructor(options = {}) {
    this.options = { ...presets["moonlit-attic"], motion: true, ...options };
    this.resize(1280, 800);
  }
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.cols = 100;
    this.rows = Math.max(24, Math.round((100 * height) / width));
    this.grid = new Float32Array(this.cols * this.rows * 4);
    this.update(0);
  }
  configure(options) {
    Object.assign(this.options, options);
  }
  update(time) {
    const o = this.options,
      t = o.motion ? time * 0.001 : 0;
    const origin = o.position / 100,
      angle = (o.direction - 50) * 0.012 + Math.sin(t * 0.19) * 0.018;
    this.direction = { x: Math.sin(angle), y: Math.cos(angle) };
    const rgb = [
      mix(145, 255, o.warmth / 100),
      mix(192, 192, o.warmth / 100),
      mix(250, 124, o.warmth / 100),
    ];
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const u = x / (this.cols - 1),
          v = y / (this.rows - 1),
          across = u - origin - (v + 0.08) * Math.tan(angle);
        const spread = 0.1 + (v + 0.1) * 0.29;
        const beam =
          Math.exp(-Math.pow(across / spread, 4) * 2) / (1 + v * 0.75);
        const shadow =
          1 -
          0.65 *
            Math.exp(
              -Math.pow((across - spread * 0.12) / (0.008 + v * 0.014), 2),
            );
        const cloud = 0.93 + 0.07 * Math.sin(t * 0.24);
        const moon = (beam * shadow * cloud * o.intensity) / 100;
        const warm =
          o.fill / 100 / (1 + ((u - 0.98) ** 2 * 12 + (v - 0.35) ** 2 * 4));
        const intensity = clamp(0.022 + moon + warm * 0.65, 0, 1),
          i = (y * this.cols + x) * 4,
          total = moon + warm + 0.025;
        this.grid[i] = intensity;
        this.grid[i + 1] = (rgb[0] * moon + 255 * warm + 130 * 0.025) / total;
        this.grid[i + 2] = (rgb[1] * moon + 176 * warm + 158 * 0.025) / total;
        this.grid[i + 3] = (rgb[2] * moon + 98 * warm + 200 * 0.025) / total;
      }
  }
  sample(x, y, out = {}) {
    const gx = clamp(x / this.width, 0, 1) * (this.cols - 1),
      gy = clamp(y / this.height, 0, 1) * (this.rows - 1),
      ix = Math.min(this.cols - 2, Math.floor(gx)),
      iy = Math.min(this.rows - 2, Math.floor(gy)),
      fx = gx - ix,
      fy = gy - iy;
    const a = (iy * this.cols + ix) * 4,
      b = a + 4,
      c = a + this.cols * 4,
      d = c + 4;
    for (let k = 0; k < 4; k++)
      out[["intensity", "r", "g", "b"][k]] = mix(
        mix(this.grid[a + k], this.grid[b + k], fx),
        mix(this.grid[c + k], this.grid[d + k], fx),
        fy,
      );
    return out;
  }
}
