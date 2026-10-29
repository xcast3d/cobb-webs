import { clamp } from "./math.js";

/** Fixed 120 Hz Verlet integration with unilateral, mass-weighted silk constraints. */
export class SilkPhysics {
  constructor(geometry) {
    this.geometry = geometry;
    this.accumulator = 0;
    this.time = 0;
    this.dirty = true;
    this.pointer = null;
    this.grabbed = new Map();
    this.quiet = 0;
    this.fragmentBudget = Math.min(
      1500,
      Math.floor(geometry.nodes.length * 0.5),
    );
  }
  release() {
    this.pointer = null;
    this.grabbed.clear();
  }
  move(x, y, pressed = false) {
    const previous = this.pointer;
    this.pointer = { x, y };
    this.quiet = 0;
    if (!previous) return;
    const { nodes, webs } = this.geometry,
      dx = x - previous.x,
      dy = y - previous.y;
    if (Math.hypot(dx, dy) > 240) {
      this.grabbed.clear();
      return;
    }
    const radius = pressed ? 40 : 24;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.pin) continue;
      const t = clamp(
        ((n.x - previous.x) * dx + (n.y - previous.y) * dy) /
          (dx * dx + dy * dy || 1),
        0,
        1,
      );
      const distance = Math.hypot(
        n.x - previous.x - dx * t,
        n.y - previous.y - dy * t,
      );
      if (distance < radius) {
        webs[n.web].activated = true;
        if (!this.grabbed.has(i))
          this.grabbed.set(i, {
            x: clamp(n.x - x, -radius, radius) * 0.4,
            y: clamp(n.y - y, -radius, radius) * 0.4,
          });
      }
    }
  }
  tear(edge) {
    edge.broken = true;
    this.dirty = true;
    // A snapped strand leaves a short tethered end; fragments never spawn fragments.
    if (edge.kind === "fragment" || edge.rest < 8 || this.fragmentBudget <= 0)
      return;
    const { nodes, edges } = this.geometry;
    const source = nodes[edge.a].pin ? edge.b : edge.a;
    const a = nodes[source],
      b = nodes[source === edge.a ? edge.b : edge.a];
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const rest = edge.rest * 0.32;
    const x = a.x + ((b.x - a.x) / length) * rest,
      y = a.y + ((b.y - a.y) / length) * rest;
    const tip = nodes.length;
    nodes.push({
      ...a,
      x,
      y,
      px: x - (a.x - a.px) * 0.3,
      py: y - (a.y - a.py) * 0.3,
      pin: false,
    });
    edges.push({
      ...edge,
      a: source,
      b: tip,
      rest,
      kind: "fragment",
      broken: false,
      fatigue: 0,
      thick: 0.3,
      curve: 0.1,
    });
    this.fragmentBudget--;
  }
  connectivity() {
    const { nodes, edges } = this.geometry,
      adj = nodes.map(() => []),
      seen = new Uint8Array(nodes.length);
    for (const e of edges)
      if (!e.broken) {
        adj[e.a].push(e.b);
        adj[e.b].push(e.a);
      }
    for (let i = 0; i < nodes.length; i++) {
      if (seen[i]) continue;
      const component = [i];
      seen[i] = 1;
      let pins = 0;
      for (let j = 0; j < component.length; j++) {
        const id = component[j];
        if (nodes[id].pin) pins++;
        for (const next of adj[id])
          if (!seen[next]) {
            seen[next] = 1;
            component.push(next);
          }
      }
      for (const id of component) nodes[id].supports = pins;
    }
    this.dirty = false;
  }
  step(elapsed) {
    this.accumulator += clamp(elapsed, 0, 0.05);
    const dt = 1 / 120;
    while (this.accumulator >= dt) {
      this.integrate(dt);
      this.accumulator -= dt;
    }
  }
  integrate(dt) {
    if (this.dirty) this.connectivity();
    this.time += dt;
    this.quiet += dt;
    if (this.quiet > 0.18) this.grabbed.clear();
    const { nodes, edges, webs } = this.geometry;
    for (const n of nodes) {
      if (n.pin || !webs[n.web]?.activated) continue;
      const loose = n.supports <= 1;
      const damping = loose ? 0.98 : 0.975;
      const vx = clamp((n.x - n.px) * damping, -8, 8),
        vy = clamp((n.y - n.py) * damping, -8, 8);
      n.px = n.x;
      n.py = n.y;
      // A shared breeze carries loose sheets together; a smaller ripple lets
      // their ends flutter. Supported webs retain their original gentle forces.
      const phase = n.web * 2.4;
      const breeze =
        Math.sin(this.time * 1.65 + phase) * 36 +
        Math.sin(this.time * 0.65 + phase) * 12;
      const ripple =
        Math.sin(this.time * 2.8 + (n.restY ?? n.y) * 0.012 + phase) * 5;
      const wind = loose
        ? (breeze + ripple) * (n.supports === 0 ? 1 : 0.65)
        : Math.sin(this.time * 0.8 + phase) * 5;
      n.x += vx + wind * dt * dt;
      n.y +=
        vy + (n.supports === 0 ? 160 : n.supports === 1 ? 85 : 9) * dt * dt;
    }
    // Cursor attraction is applied per simulation step, independent of event frequency.
    if (this.pointer)
      for (const [id, offset] of this.grabbed) {
        const n = nodes[id];
        n.x += (this.pointer.x + offset.x - n.x) * 0.16;
        n.y += (this.pointer.y + offset.y - n.y) * 0.16;
      }
    for (const e of edges) {
      if (e.broken || !webs[e.web]?.activated) continue;
      const a = nodes[e.a],
        b = nodes[e.b],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      const strain = Math.max(0, length / e.rest - 1);
      const limit =
        e.kind === "support" || e.kind === "frame"
          ? 0.48
          : e.kind === "radial"
            ? 0.36
            : 0.24;
      e.fatigue = Math.max(
        0,
        (e.fatigue || 0) + (strain > limit ? dt * (strain / limit) : -dt * 2),
      );
      if (e.fatigue > 0.035 && length > e.rest + 4) {
        this.tear(e);
      }
    }
    for (let pass = 0; pass < 7; pass++)
      for (const e of edges) {
        if (e.broken || !webs[e.web]?.activated) continue;
        const a = nodes[e.a],
          b = nodes[e.b],
          dx = b.x - a.x,
          dy = b.y - a.y,
          len = Math.hypot(dx, dy);
        // Compression produces slack, never a spring pushing the silk apart.
        const excess = Math.max(0, len - e.rest);
        if (!excess || !len) continue;
        const wa = a.pin ? 0 : this.grabbed.has(e.a) ? 0.25 : 1,
          wb = b.pin ? 0 : this.grabbed.has(e.b) ? 0.25 : 1;
        if (!wa && !wb) continue;
        const correction = ((excess / len) * 0.85) / (wa + wb);
        a.x += dx * correction * wa;
        a.y += dy * correction * wa;
        b.x -= dx * correction * wb;
        b.y -= dy * correction * wb;
      }
  }
}
