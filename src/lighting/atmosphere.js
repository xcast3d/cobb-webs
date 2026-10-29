import { rng } from "../engine/math.js";
export class Atmosphere {
  constructor(mask, dust, field) {
    this.mask = mask;
    this.dust = dust;
    this.field = field;
    this.context = mask.getContext("2d");
    this.dctx = dust.getContext("2d");
    this.sample = {};
    this.glows = new Map();
  }
  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dust.width = width * dpr;
    this.dust.height = height * dpr;
    this.dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Render near CSS-pixel resolution, rather than stretching quantized grid cells.
    // Cap large displays to keep CPU work and buffer allocation bounded.
    const scale = Math.min(1, 1600 / Math.max(width, height));
    this.mask.width = Math.round(width * scale);
    this.mask.height = Math.round(height * scale);
    this.columns = Array.from({ length: this.mask.width }, (_, x) => {
      const gx = (x / Math.max(1, this.mask.width - 1)) * (this.field.cols - 1);
      const index = Math.min(this.field.cols - 2, Math.floor(gx));
      return { index: index * 4, fraction: gx - index };
    });
    this.shading = new Float32Array(this.field.grid.length);
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
      tumble: 0.7 + random() * 1.1,
      glintPhase: random() * Math.PI * 2,
    }));
  }
  drawMask() {
    const { grid, cols, rows } = this.field,
      shade = this.shading;
    // Preserve fractional RGBA until the final output pixel. Quantizing the
    // small grid first produces broad opacity contours when magnified.
    for (let i = 0; i < grid.length; i += 4) {
      const light = grid[i];
      shade[i] = 3 + grid[i + 1] * light * 0.065;
      shade[i + 1] = 6 + grid[i + 2] * light * 0.065;
      shade[i + 2] = 12 + grid[i + 3] * light * 0.065;
      shade[i + 3] = 255 * (0.98 - 0.24 * light);
    }
    const bytes = this.pixels.data,
      width = this.mask.width,
      height = this.mask.height;
    for (let y = 0; y < height; y++) {
      const gy = (y / Math.max(1, height - 1)) * (rows - 1),
        iy = Math.min(rows - 2, Math.floor(gy)),
        fy = gy - iy;
      const row = iy * cols * 4;
      for (let x = 0; x < width; x++) {
        const { index, fraction: fx } = this.columns[x],
          a = row + index,
          b = a + 4,
          c = a + cols * 4,
          d = c + 4;
        const out = (y * width + x) * 4;
        // Stable sub-byte noise breaks up 8-bit bands without animated grain.
        let hash = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
        hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
        const noise = (hash >>> 0) / 4294967296 - 0.5;
        for (let channel = 0; channel < 4; channel++) {
          const top =
            shade[a + channel] + (shade[b + channel] - shade[a + channel]) * fx;
          const bottom =
            shade[c + channel] + (shade[d + channel] - shade[c + channel]) * fx;
          bytes[out + channel] = top + (bottom - top) * fy + noise;
        }
      }
    }
    this.context.putImageData(this.pixels, 0, 0);
  }
  glowSprite(r, g, b) {
    // Small, reusable colored halos; no per-mote gradients or shadow blurs.
    const rgb = [r, g, b].map((v) => Math.min(255, Math.round(v / 32) * 32));
    const key = rgb.join(",");
    if (this.glows.has(key)) return this.glows.get(key);
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const ctx = sprite.getContext("2d"),
      gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, `rgba(${rgb},1)`);
    gradient.addColorStop(0.2, `rgba(${rgb},.45)`);
    gradient.addColorStop(0.55, `rgba(${rgb},.10)`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    if (this.glows.size >= 128)
      this.glows.delete(this.glows.keys().next().value);
    this.glows.set(key, sprite);
    return sprite;
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
      // Tumbling particles catch the beam briefly, with independent phases
      // and broad peaks rather than synchronized blinking or sharp flashes.
      const tumble =
        0.5 + 0.5 * Math.sin(time * 0.001 * m.tumble + m.glintPhase);
      const glint = Math.pow(tumble, 6) * Math.pow(l.intensity, 1.4);
      const alpha = Math.min(
        0.9,
        l.intensity * (0.17 + m.depth * 0.34) * (0.8 + tumble * 0.35) +
          glint * 0.38,
      );
      if (l.intensity > 0.06) {
        const radius = m.r * (3.5 + glint * 2);
        c.globalCompositeOperation = "lighter";
        c.globalAlpha =
          l.intensity * (0.06 + glint * 0.3) * (0.5 + m.depth * 0.5);
        c.drawImage(
          this.glowSprite(l.r, l.g, l.b),
          m.x - radius,
          m.y - radius,
          radius * 2,
          radius * 2,
        );
        c.globalCompositeOperation = "source-over";
        c.globalAlpha = 1;
      }
      c.fillStyle = `rgba(${l.r | 0},${l.g | 0},${l.b | 0},${alpha})`;
      c.beginPath();
      c.arc(m.x, m.y, m.r * (1 + glint * 0.12), 0, Math.PI * 2);
      c.fill();
    }
  }
}
