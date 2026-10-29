import test from "node:test";
import assert from "node:assert/strict";
import { growthForDays } from "../src/engine/config.js";
import {
  DAY,
  DEFAULTS,
  VISIT_GAP,
  forgetVisits,
  isOn,
  sitesToForget,
  originOf,
  recordVisit,
  resolveSettings,
  sceneOptions,
  shouldShow,
} from "../extension/src/core.js";

test("growth without a curve keeps the original 90-day mapping", () => {
  assert.deepEqual(growthForDays(1), {
    layers: 2,
    density: 30,
    coverage: 40,
    structure: 95 - 1 / 14,
  });
  const full = growthForDays(90);
  assert.equal(full.layers, 5);
  assert.equal(full.coverage, 85);
});

test("growth curve reaches full at fullAt and keeps getting heavier each day", () => {
  const curve = { startDays: 3, fullAt: 30, shape: "ease", layered: true };
  assert.equal(growthForDays(3, "high", curve).coverage, 40);
  assert.equal(growthForDays(30, "high", curve).coverage, 85);
  assert.equal(growthForDays(30, "high", curve).layers, 7);
  let previous = growthForDays(3, "high", curve);
  for (let d = 4; d <= 30; d++) {
    const g = growthForDays(d, "high", curve);
    assert.ok(g.coverage > previous.coverage, `coverage grows on day ${d}`);
    assert.ok(g.sag > previous.sag && g.clusters > previous.clusters);
    assert.ok(g.structure < previous.structure);
    previous = g;
  }
  assert.ok(
    growthForDays(10, "high", { ...curve, shape: "log" }).coverage >
      growthForDays(10, "high", { ...curve, shape: "linear" }).coverage,
  );
  assert.ok(
    growthForDays(10, "high", { ...curve, scale: 1.5 }).coverage >
      growthForDays(10, "high", curve).coverage,
  );
});

test("visits: first load records, same session doesn't count, a return counts days", () => {
  const t0 = Date.UTC(2026, 0, 1);
  let v = recordVisit({ enabled: true }, t0);
  assert.equal(v.newVisit, false);
  v = recordVisit(v.site, t0 + VISIT_GAP / 2);
  assert.equal(v.newVisit, false);
  v = recordVisit(v.site, t0 + VISIT_GAP / 2 + 12 * DAY);
  assert.deepEqual([v.newVisit, v.days, v.site.lastAway], [true, 12, 12]);
  assert.ok(shouldShow(v, resolveSettings({}, {})));
  assert.equal(shouldShow(v, resolveSettings({ minDays: 14 }, {})), false);
  assert.equal(
    shouldShow(recordVisit(v.site, v.site.lastVisit + 1000), DEFAULTS),
    false,
  );
});

test("site settings override defaults; scene never gets the web bug", () => {
  const s = resolveSettings(
    { minDays: 5, silk: "gold" },
    { settings: { minDays: 2 } },
  );
  assert.equal(s.minDays, 2);
  assert.equal(s.silk, "gold");
  const o = sceneOptions(s, 9);
  assert.equal(o.cobwebsBug, false);
  assert.equal(o.growth.startDays, 2);
  assert.equal(o.web.silk, "gold");
});

test("only regular web pages get an origin", () => {
  assert.equal(originOf("https://example.com/a?b"), "https://example.com");
  assert.equal(originOf("chrome://extensions"), null);
  assert.equal(originOf("file:///tmp/a.html"), null);
  assert.equal(originOf("https://chromewebstore.google.com/x"), null);
});

test("on by default; turning off and forgetting keep the user's choices", () => {
  assert.ok(isOn(undefined) && isOn({ lastVisit: 1 }));
  assert.equal(isOn({ disabled: true }), false);
  assert.deepEqual(
    forgetVisits({
      lastVisit: 1,
      previousVisit: 0,
      lastAway: 3,
      disabled: true,
    }),
    { disabled: true },
  );
});

test("storage cap forgets the oldest plain records only", () => {
  const stored = {
    defaults: {},
    "site:https://a.test": { lastVisit: 1 },
    "site:https://b.test": { lastVisit: 2, disabled: true },
    "site:https://c.test": { lastVisit: 3 },
    "site:https://d.test": { lastVisit: 4 },
  };
  assert.deepEqual(sitesToForget(stored, 4), []);
  assert.deepEqual(sitesToForget(stored, 2), [
    "site:https://a.test",
    "site:https://c.test",
  ]);
});
