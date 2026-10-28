import { rng } from "../engine/math.js";
export class Atmosphere {
  constructor(mask, dust, field) {
    this.mask = mask;
    this.dust = dust;
    this.field = field;
    this.context = mask.getContext("2d");
    this.dctx = dust.getContext("2d");
    this.sample = {};
  }
  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dust.width = width * dpr;
    this.dust.height = height * dpr;
    this.dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.mask.width = this.field.cols;
    this.mask.height = this.field.rows;
    this.pixels = this.context.createImageData(
      this.mask.width,
      this.mask.height,
    );
    const random = rng(420),
      count = Math.min(650, Math.round((width * height) / 2600));
    this.motes = Array.from({ length: count }, () => ({
      x: random() * width,
      y: random() * height,
      r: 0.3 + random() * 0.65,
      phase: random() * 6.28,
      depth: random(),
    }));
  }
  drawMask() {
    const { grid } = this.field,
      bytes = this.pixels.data;
    for (let i = 0; i < grid.length; i += 4) {
      const light = grid[i];
      bytes[i] = 3 + grid[i + 1] * light * 0.065;
      bytes[i + 1] = 6 + grid[i + 2] * light * 0.065;
      bytes[i + 2] = 12 + grid[i + 3] * light * 0.065;
      bytes[i + 3] = 255 * (0.98 - 0.24 * light);
    }
    this.context.putImageData(this.pixels, 0, 0);
  }
  drawDust(time, dt) {
    const c = this.dctx;
    c.clearRect(0, 0, this.width, this.height);
    for (const m of this.motes) {
      m.x =
        (m.x + Math.sin(time * 0.0004 + m.phase) * dt * 9 + this.width) %
        this.width;
      m.y = (m.y - dt * (2 + m.depth * 4) + this.height) % this.height;
      const l = this.field.sample(m.x, m.y, this.sample);
      c.fillStyle = `rgba(${l.r | 0},${l.g | 0},${l.b | 0},${l.intensity * (0.18 + m.depth * 0.4)})`;
      c.beginPath();
      c.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      c.fill();
    }
  }
}
