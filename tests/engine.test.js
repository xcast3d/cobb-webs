import test from "node:test";
import assert from "node:assert/strict";
import { generateWebs } from "../src/engine/generator.js";
import { SilkPhysics } from "../src/engine/physics.js";
import { LightField } from "../src/lighting/light-field.js";
import { visitDecision } from "../src/experience/visits.js";

test("seeded geometry is repeatable, bounded, and independent of the DOM", () => {
  const a = generateWebs({ seed: "TEST" }),
    b = generateWebs({ seed: "TEST" });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, generateWebs({ seed: "OTHER" }));
  assert.ok(a.nodes.length < 5000);
  assert.ok(a.edges.length < 10000);
  for (const e of a.edges) {
    assert.ok(a.nodes[e.a]);
    assert.ok(a.nodes[e.b]);
    assert.ok(e.rest > 0);
    assert.ok(Number.isInteger(e.web));
  }
  assert.ok(a.edges.some((e) => e.kind === "frame"));
});
test("untouched silk remains at rest; pins stay fixed after brushing", () => {
  const g = generateWebs({ seed: "TEST" }),
    original = structuredClone(g.nodes),
    p = new SilkPhysics(g);
  for (let i = 0; i < 120; i++) p.step(1 / 60);
  assert.deepEqual(
    g.nodes.map((n) => [n.x, n.y]),
    original.map((n) => [n.x, n.y]),
  );
  const n = g.nodes.find((n) => !n.pin && n.x > 0 && n.y > 0);
  p.move(n.x - 10, n.y);
  p.move(n.x + 10, n.y, true);
  for (let i = 0; i < 180; i++) p.step(1 / 60);
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i];
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    if (n.pin) assert.deepEqual([n.x, n.y], [original[i].x, original[i].y]);
  }
  assert.ok(g.webs.some((w) => w.activated));
});
test("fixed step gives the same result at 30 and 120 frames per second", () => {
  const a = generateWebs({ seed: "CLOCK" }),
    b = structuredClone(a),
    pa = new SilkPhysics(a),
    pb = new SilkPhysics(b);
  for (const p of [pa, pb]) {
    p.geometry.webs.forEach((w) => (w.activated = true));
  }
  for (let i = 0; i < 30; i++) pa.step(1 / 30);
  for (let i = 0; i < 120; i++) pb.step(1 / 120);
  for (let i = 0; i < a.nodes.length; i++)
    assert.ok(
      Math.hypot(a.nodes[i].x - b.nodes[i].x, a.nodes[i].y - b.nodes[i].y) <
        0.0001,
    );
});
test("unsupported silk falls and loaded capture silk tears", () => {
  const g = {
    nodes: [
      { x: 0, y: 0, px: 0, py: 0, pin: true, web: 0 },
      { x: 20, y: 0, px: 20, py: 0, pin: false, web: 0 },
    ],
    edges: [{ a: 0, b: 1, rest: 10, web: 0, kind: "capture" }],
    webs: [{ activated: true }],
  };
  const p = new SilkPhysics(g);
  for (let i = 0; i < 20; i++) {
    g.nodes[1].x = 100;
    p.integrate(1 / 120);
  }
  assert.equal(g.edges[0].broken, true);
  p.release();
  for (let i = 0; i < 120; i++) p.integrate(1 / 120);
  assert.ok(g.nodes[1].y > 1);
});
test("lighting is finite, spatially colored, and static with motion off", () => {
  const l = new LightField({ motion: false, fill: 80 });
  l.update(0);
  const initial = Array.from(l.grid);
  l.update(10000);
  assert.deepEqual(Array.from(l.grid), initial);
  const a = l.sample(200, 100),
    b = l.sample(1200, 300);
  assert.notEqual(a.r / a.b, b.r / b.b);
  for (const v of Object.values(l.sample(-999, 99999)))
    assert.ok(Number.isFinite(v));
});
test("visit policy skips first visits and repeats, and tolerates blocked storage", () => {
  const map = new Map(),
    sm = new Map(),
    storage = { getItem: (k) => map.get(k), setItem: (k, v) => map.set(k, v) },
    session = { getItem: (k) => sm.get(k), setItem: (k, v) => sm.set(k, v) };
  const now = 100 * 86400000;
  assert.equal(visitDecision({ now, storage, session }).show, false);
  const decision = visitDecision({
    now: now + 20 * 86400000,
    storage,
    session,
  });
  assert.deepEqual(decision, { days: 20, show: true });
  assert.equal(
    visitDecision({ now: now + 40 * 86400000, storage, session }).show,
    false,
  );
  assert.equal(
    visitDecision({
      test: true,
      storage: {
        getItem() {
          throw Error();
        },
      },
    }).show,
    true,
  );
});
