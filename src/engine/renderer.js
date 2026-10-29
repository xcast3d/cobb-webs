import { clamp, mix } from "./math.js";
export class SilkRenderer {
  constructor(canvas, field) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.field = field;
    this.sample = {};
  }
  resize(width, height, dpr) {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  style(e, a, b, config) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy) || 1,
      l = this.field.sample((a.x + b.x) / 2, (a.y + b.y) / 2, this.sample);
    const facing = Math.abs(
      (dx / len) * this.field.direction.y - (dy / len) * this.field.direction.x,
    );
    const glint = Math.pow(facing, 8) * l.intensity * 0.25;
    const alpha = clamp(
      (0.055 + l.intensity * 0.6 + glint) * mix(0.45, 1, e.z) * e.shimmer,
      0,
      0.85,
    );
    const tint =
      config.silk === "gold"
        ? [1, 0.86, 0.61]
        : config.silk === "white"
          ? [1, 1, 1]
          : [0.87, 0.94, 1];
    // Neutral silk reflects the local illuminant directly. Optional material
    // tints remain available to the standalone art generator.
    const rgb = [l.r, l.g, l.b].map((v, i) =>
      Math.round(v * (config.silk === "light" ? 1 : tint[i])),
    );
    const width =
      (["radial", "frame", "support"].includes(e.kind) ? 0.72 : 0.43) *
      e.thick *
      mix(0.7, 1.35, e.z) *
      mix(0.45, 1.6, config.thickness / 100);
    // Slack is a function of the physical endpoints, so a stretched strand straightens.
    const slack = Math.max(0, e.rest - len);
    const sag = Math.min(
      35,
      len * (e.curve || 0) * 0.38 + Math.sqrt(slack * e.rest) * 0.35,
    );
    return { alpha, rgb, width, sag };
  }
  paint(geometry, config, context = this.ctx) {
    const c = context;
    c.clearRect(0, 0, geometry.width, geometry.height);
    c.lineCap = "round";
    // Quantized styles batch thousands of strands without per-edge canvas gradients.
    const batches = new Map();
    for (const e of geometry.edges) {
      if (e.broken) continue;
      const a = geometry.nodes[e.a],
        b = geometry.nodes[e.b],
        s = this.style(e, a, b, config);
      const alpha = Math.round(s.alpha * 24) / 24,
        width = Math.max(0.2, Math.round(s.width * 5) / 5),
        rgb = s.rgb.map((v) => Math.min(255, Math.round(v / 8) * 8)),
        key = `${rgb}:${alpha}:${width}`;
      if (!batches.has(key))
        batches.set(key, { path: new Path2D(), alpha, width, rgb });
      const path = batches.get(key).path;
      path.moveTo(a.x, a.y);
      path.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + s.sag, b.x, b.y);
    }
    for (const { path, alpha, width, rgb } of batches.values()) {
      c.strokeStyle = `rgba(${rgb},${alpha})`;
      c.lineWidth = width;
      c.stroke(path);
    }
    if (config.anchors) {
      c.fillStyle = "#edc181";
      for (const n of geometry.nodes)
        if (n.pin) {
          c.beginPath();
          c.arc(
            clamp(n.x, 4, geometry.width - 4),
            clamp(n.y, 4, geometry.height - 4),
            3,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
    }
  }
  svg(geometry, config) {
    const f = (n) => n.toFixed(2);
    const paths = geometry.edges
      .filter((e) => !e.broken)
      .map((e) => {
        const a = geometry.nodes[e.a],
          b = geometry.nodes[e.b],
          s = this.style(e, a, b, config);
        return `<path d="M${f(a.x)} ${f(a.y)} Q${f((a.x + b.x) / 2)} ${f((a.y + b.y) / 2 + s.sag)} ${f(b.x)} ${f(b.y)}" stroke="rgb(${s.rgb})" stroke-width="${f(s.width)}" opacity="${f(s.alpha)}"/>`;
      });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.width} ${geometry.height}" fill="none" stroke-linecap="round">${paths.join("")}</svg>`;
  }
}
