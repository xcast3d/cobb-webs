import { WebEngine } from "../engine/index.js";
export {
  WebEngine,
  generateWebs,
  SilkPhysics,
  SilkRenderer,
} from "../engine/index.js";
export { normalizeConfig, controls } from "../engine/config.js";

/** Neutral illumination for artwork, independent of the room's lighting model. */
export class StudioLight {
  constructor() {
    this.direction = { x: 0, y: 1 };
  }
  sample(x, y, out = {}) {
    return Object.assign(out, { intensity: 1, r: 255, g: 255, b: 255 });
  }
}

/** Standalone canvas tool. No overlays, visit storage, global listeners, or owned RAF. */
export function createGenerator(
  canvas,
  { width = 1600, height = 1200, ...config } = {},
) {
  const engine = new WebEngine(canvas, new StudioLight(), {
    physics: false,
    ...config,
  });
  function resize(w, h) {
    if (
      !Number.isInteger(w) ||
      !Number.isInteger(h) ||
      w < 64 ||
      h < 64 ||
      w > 4096 ||
      h > 4096
    )
      throw new RangeError(
        "Artwork dimensions must be integers between 64 and 4096.",
      );
    engine.resize(w, h, 1);
    engine.frame(0);
  }
  resize(width, height);
  return {
    engine,
    resize,
    generate(options = {}) {
      engine.generate(options);
      engine.frame(0);
    },
    frame(dt) {
      engine.frame(dt);
    },
    move(x, y, pressed = false) {
      engine.move(x, y, pressed);
    },
    release() {
      engine.release();
    },
    svg() {
      return engine.svg();
    },
    png() {
      return engine.png();
    },
    config() {
      return { width: engine.width, height: engine.height, ...engine.config };
    },
  };
}
