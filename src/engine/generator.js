import { hash, rng, clamp, mix } from "./math.js";
import { normalizeConfig } from "./config.js";

/** Pure seeded geometry; no DOM, canvas, timers, or scene dependencies. */
export function generateWebs(options = {}, W = 1280, H = 800) {
  const settings = normalizeConfig(options);
  const nodes = [],
    edges = [],
    webs = [];
  function breakSilk(e, rr) {
    e.broken = true;
    if (e.rest < 8 || rr() > 0.6) return;
    const a = nodes[e.a],
      b = nodes[e.b];
    const tip = addNode(
      mix(a.x, b.x, 0.38),
      mix(a.y, b.y, 0.38) + 2,
      false,
      e.z,
    );
    nodes[tip].web = a.web;
    addEdge(e.a, tip, "fragment", e.z, rr, 1, 0.24, 0.15);
  }
  function addNode(x, y, pin = false, z = 0) {
    nodes.push({
      x,
      y,
      px: x,
      py: y,
      restX: x,
      restY: y,
      pin,
      z,
      grab: 0,
      loose: false,
    });
    return nodes.length - 1;
  }
  function addEdge(a, b, kind, z, rr, integrity = 1, thick = 1, curve = 0) {
    if (a === b) return;
    const A = nodes[a],
      B = nodes[b];
    edges.push({
      a,
      b,
      kind,
      z,
      rest: Math.hypot(A.x - B.x, A.y - B.y),
      integrity,
      thick,
      curve,
      phase: rr() * 6.28,
      broken: false,
      shimmer: 0.8 + rr() * 0.4,
    });
  }
  // Original v0.8 large-scale layout, with deterministic jitter. Never divide the canvas into narrow columns.
  const templates = [
    [0.08, 0.15, 0.63],
    [0.92, 0.18, 0.62],
    [0.12, 0.86, 0.52],
    [0.89, 0.84, 0.55],
    [0.5, 0.13, 0.53],
    [0.06, 0.5, 0.5],
    [0.94, 0.52, 0.52],
    [0.5, 0.84, 0.48],
    [0.5, 0.5, 0.45],
  ];
  function generate() {
    const rr = rng(hash(settings.seed));
    const r = Math.min(W, H),
      v = settings.variation / 100,
      p = settings.structure / 100,
      d = settings.density / 100,
      cover = settings.coverage / 100,
      sag = settings.sag / 100;
    const count = settings.layers;
    const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let k = 0; k < count; k++) {
      const start = edges.length; // Track this web’s edges for independent deterioration.
      const [tx, ty, tr] = templates[order[k]];
      const z = count === 1 ? 0.5 : k / (count - 1);
      const size =
        tr * r * mix(0.43, 1.2, cover) * (1 + (rr() - 0.5) * 0.35 * v);
      const cx = tx * W + (rr() - 0.5) * r * 0.12 * v,
        cy = Math.max(size * 0.52 + 8, ty * H + (rr() - 0.5) * r * 0.12 * v);
      const arms = Math.round(mix(15, 32, d) * (1 + (rr() - 0.5) * 0.23 * v));
      const rings = Math.round(mix(7, 18, d));
      const phase = rr() * 6.283;
      const squash = mix(0.86, 0.58, v * rr()); // Each web has its own construction profile: capture silk may be concentrated
      // near the hub, near the perimeter, or in broad irregular bands.
      const profile = Math.floor(rr() * 3),
        profilePhase = rr() * 6.283;
      const sectorPhase = rr() * 6.283,
        sectorPhase2 = rr() * 6.283;
      const sectorFreq = 1 + Math.floor(rr() * 3),
        sectorFreq2 = 2 + Math.floor(rr() * 3);
      // One monotonically increasing spacing sequence, shared by all spokes.
      // This prevents unrelated missing rings or discontinuous radial rows.
      const weights = [];
      for (let j = 0; j < rings; j++) {
        const t = (j + 0.5) / rings;
        const radial =
          profile === 0
            ? 0.48 + 1.5 * t
            : profile === 1
              ? 1.98 - 1.45 * t
              : 1 + 0.4 * Math.sin(t * 10 + profilePhase);
        weights.push(
          Math.max(
            0.22,
            radial * (1 + v * 0.28 * Math.sin(t * 13 + profilePhase)),
          ),
        );
      }
      const sum = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      const turns = [];
      for (let j = 0; j < rings; j++) {
        acc += weights[j] / sum;
        turns.push(acc);
      }
      // A naturally open zone between the compact hub and the capture spiral.
      const hubGap = mix(0.035, 0.11, v * rr());
      const hub = addNode(cx, cy, false, z);
      const spokes = [],
        outer = [];
      const armAngles = Array.from(
        { length: arms },
        (_, i) => phase + (i * 2 * Math.PI) / arms + (rr() - 0.5) * v * 0.075,
      );
      const armReach = Array.from({ length: arms }, () =>
        mix(0.86, 1.13, rr()),
      );
      const sectorStretch = (angle) =>
        1 +
        v *
          (0.18 * Math.sin(sectorFreq * angle + sectorPhase) +
            0.1 * Math.sin(sectorFreq2 * angle + sectorPhase2));
      for (let i = 0; i < arms; i++) {
        const angle = armAngles[i],
          reach = armReach[i];
        let prev = hub;
        const chain = [];
        for (let j = 0; j < rings; j++) {
          const previous = j === 0 ? 0 : turns[j - 1];
          const spiralTurn =
            previous + (turns[j] - previous) * (0.15 + (0.85 * i) / arms);
          const t = hubGap + (1 - hubGap) * (j === rings - 1 ? 1 : spiralTurn);
          const theta = angle + v * 0.045 * Math.sin(t * 3 + i * 0.35);
          const localSpacing =
            1 + v * 0.075 * Math.sin(t * 8 + angle * sectorFreq + sectorPhase);
          const radius = size * t * reach * sectorStretch(angle) * localSpacing;
          const x = cx + Math.cos(theta) * radius,
            y =
              cy +
              Math.sin(theta) * radius * squash +
              sag * size * 0.065 * t * t;
          const id = addNode(x, y, false, z);
          chain.push(id);
          addEdge(prev, id, "radial", z, rr, rr(), 0.85 + rr() * 0.4);
          prev = id;
        }
        spokes.push(chain);
        outer.push(chain[chain.length - 1]);
      }
      for (let i = 0; i < arms; i++)
        addEdge(outer[i], outer[(i + 1) % arms], "frame", z, rr, 1, 0.85, 0.02);
      // Independent physical supports: 2–5 points per web, biased toward
      // nearby ceiling / wall edges. The frame anchors remain fixed; the silk
      // tether connecting each anchor to the web is fragile and can release.
      const supportCount = 3 + Math.floor(rr() * 3);
      const candidate = [];
      for (let i = 0; i < arms; i++) {
        const q = nodes[outer[i]],
          choices = [
            {
              x: clamp(q.x + (rr() - 0.5) * W * 0.12, -12, W + 12),
              y: -9,
              dist: Math.abs(q.y + 9),
              side: "top",
            },
            {
              x: W + 9,
              y: clamp(q.y + (rr() - 0.5) * H * 0.12, -12, H + 12),
              dist: Math.abs(W + 9 - q.x),
              side: "right",
            },
            {
              x: -9,
              y: clamp(q.y + (rr() - 0.5) * H * 0.12, -12, H + 12),
              dist: Math.abs(q.x + 9),
              side: "left",
            },
            {
              x: clamp(q.x + (rr() - 0.5) * W * 0.12, -12, W + 12),
              y: H + 9,
              dist: Math.abs(H + 9 - q.y),
              side: "bottom",
            },
          ];
        choices.sort((a, b) => a.dist - b.dist);
        for (const c of choices.slice(0, 2))
          candidate.push({
            ...c,
            outer: outer[i],
            arm: i,
            score: c.dist + (c.side === "bottom" ? H * 0.42 : 0),
          });
      }
      candidate.sort((a, b) => a.score - b.score);
      const picked = [],
        usedArms = new Set(),
        usedSides = new Map();
      for (const c of candidate) {
        if (picked.length >= supportCount) break;
        if (usedArms.has(c.arm)) continue;
        if (
          picked.some(
            (v) =>
              Math.abs(v.arm - c.arm) < Math.max(2, Math.floor(arms / 7)) ||
              Math.abs(v.arm - c.arm) >
                arms - Math.max(2, Math.floor(arms / 7)),
          )
        )
          continue;
        if ((usedSides.get(c.side) || 0) >= 3) continue;
        picked.push(c);
        usedArms.add(c.arm);
        usedSides.set(c.side, (usedSides.get(c.side) || 0) + 1);
      }
      // Interior webs use longer tethers to the scene boundary rather than floating supports.
      const supportEdges = [];
      for (const c of picked) {
        const pin = addNode(c.x, c.y, true, z);
        nodes[pin].web = k;
        nodes[c.outer].web = k;
        addEdge(c.outer, pin, "support", z, rr, 1, 0.55);
        const e = edges[edges.length - 1];
        e.web = k;
        e.anchor = true;
        e.breakLimit = 1.23 + rr() * 0.26;
        e.fatigue = 0;
        supportEdges.push(edges.length - 1);
      }
      for (let ni = 0; ni < nodes.length; ni++)
        if (nodes[ni].web === undefined && nodes[ni].z === z) nodes[ni].web = k;
      // Capture silk advances a turn at each wrap, forming one continuous spiral. Spacing changes continuously
      // around the web; a sparse sector widens its cells rather than deleting edges.
      for (let j = 0; j < rings - 1; j++)
        for (let i = 0; i < arms; i++) {
          const a = spokes[i][j],
            b = spokes[(i + 1) % arms][i === arms - 1 ? j + 1 : j];
          const angle = armAngles[i],
            t = turns[j];
          const sector = 0.5 + 0.5 * Math.sin(angle * sectorFreq + sectorPhase);
          const clustered =
            0.5 + 0.5 * Math.sin(angle * sectorFreq2 + sectorPhase2 + t * 7);
          const localDensity =
            1 - v + v * (0.52 + 0.48 * sector) * (0.75 + 0.25 * clustered);
          const curve =
            (0.08 + 0.22 * sag) * (1 + 0.3 * v * Math.sin(angle * 2 + t * 8));
          addEdge(
            a,
            b,
            "capture",
            z,
            rr,
            rr(),
            (0.5 + rr() * 0.35) * localDensity,
            curve,
          );
        }
      // Fine secondary filaments in coherent neighboring patches, never duplicate
      // edges drawn directly on top of each other or isolated random missing strands.
      const patches = Math.round((settings.clusters / 100) * mix(1, 5, d));
      for (let c = 0; c < patches; c++) {
        const ai = Math.floor(rr() * arms),
          j0 = 1 + Math.floor(rr() * Math.max(1, rings - 4));
        const span = 2 + Math.floor(rr() * 4),
          height = 1 + Math.floor(rr() * 3);
        for (let ii = 0; ii < span; ii++)
          for (let jj = 0; jj < height; jj++) {
            const i = (ai + ii) % arms,
              j = Math.min(rings - 2, j0 + jj);
            if (rr() > 0.28 + 0.55 * d) continue;
            const a = spokes[i][j],
              b = spokes[(i + 1) % arms][j + 1];
            addEdge(
              a,
              b,
              "fine",
              z,
              rr,
              rr(),
              0.22 + rr() * 0.2,
              0.06 + 0.08 * sag,
            );
          }
      }
      // Deterministic deterioration. Broken silk stays attached as dangling fragments.
      const decay = 1 - p;
      for (let ei = start, end = edges.length; ei < end; ei++) {
        const e = edges[ei];
        if (e.kind === "support" || e.kind === "frame") continue;
        const resilience =
          e.kind === "radial"
            ? 0.88
            : e.kind === "cluster"
              ? 0.62
              : e.kind === "capture"
                ? 0.5
                : 0.4;
        const A = nodes[e.a],
          B = nodes[e.b],
          ang = Math.atan2((A.y + B.y) / 2 - cy, (A.x + B.x) / 2 - cx);
        const patch =
          0.5 +
          0.5 *
            Math.sin(
              ang * 2.4 +
                sectorPhase +
                (Math.hypot(A.x - cx, A.y - cy) / Math.max(size, 1)) * 5,
            );
        const threshold =
          decay * (1.0 - resilience * 0.68) * (0.45 + 0.85 * patch);
        if (e.integrity < threshold) {
          if (e.kind === "radial" && rr() < 0.48) continue;
          breakSilk(e, rr);
        }
      }
      for (let ei = start; ei < edges.length; ei++) edges[ei].web = k;
      webs.push({
        cx,
        cy,
        size,
        z,
        arms,
        rings,
        supportEdges,
        grabbed: new Set(),
        activated: false,
        swipeLoad: 0,
      });
    }
  }
  generate();
  return { nodes, edges, webs, width: W, height: H };
}
