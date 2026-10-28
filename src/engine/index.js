import { generateWebs } from "./generator.js";
import { SilkPhysics } from "./physics.js";
import { SilkRenderer } from "./renderer.js";
import { normalizeConfig } from "./config.js";
export { generateWebs, SilkPhysics, SilkRenderer };
/** No owned animation loop: callers control timing, input, and lighting. */
export class WebEngine {
  constructor(canvas, light, options = {}) {
    this.config = normalizeConfig(options);
    this.renderer = new SilkRenderer(canvas, light);
  }
  resize(width, height, dpr = 1) {
    this.width = width;
    this.height = height;
    this.renderer.resize(width, height, dpr);
    this.generate();
  }
  generate(options = {}) {
    this.config = normalizeConfig({ ...this.config, ...options });
    this.geometry = generateWebs(this.config, this.width, this.height);
    this.physics = new SilkPhysics(this.geometry);
  }
  frame(dt) {
    if (this.config.physics) this.physics.step(dt);
    this.renderer.paint(this.geometry, this.config);
  }
  move(x, y, pressed) {
    if (this.config.physics) this.physics.move(x, y, pressed);
  }
  release() {
    this.physics.release();
  }
  svg() {
    return this.renderer.svg(this.geometry, this.config);
  }
  png() {
    const canvas = document.createElement("canvas");
    canvas.width = this.width * 2;
    canvas.height = this.height * 2;
    const c = canvas.getContext("2d");
    c.scale(2, 2);
    this.renderer.paint(this.geometry, { ...this.config, anchors: false }, c);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }
}
