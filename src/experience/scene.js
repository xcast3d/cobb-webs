import css from "./scene.css?inline";
import { WebEngine } from "../engine/index.js";
import { LightField, presets } from "../lighting/light-field.js";
import { Atmosphere } from "../lighting/atmosphere.js";
import { scatterBugs } from "./bugs.js";
import { growthForDays } from "../engine/config.js";

export function createScene(options = {}) {
  const host = document.createElement("cobb-webs-scene");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${css}</style><section class="room" role="dialog" aria-modal="true" aria-label="Welcome back scene" tabindex="-1"><canvas class="lighting" aria-hidden="true"></canvas><canvas class="dust" aria-hidden="true"></canvas><canvas class="silk" aria-hidden="true"></canvas><button class="switch" aria-label="Turn on the light"><span class="plate"></span><span class="slot"></span><span class="lever"></span></button><span class="hint">Turn on the light</span><div class="bugs" aria-hidden="true"></div><section class="welcome" aria-labelledby="welcome-title" hidden><div class="eyebrow">A little time has passed</div><h2 id="welcome-title">Welcome back.</h2><p></p><button class="enter">Enter site →</button></section><button class="skip">Skip scene · Esc</button><span class="instruction">Brush the silk. Find the light.</span></section>`;
  document.body.append(host);
  const $ = (s) => root.querySelector(s),
    room = $(".room"),
    sw = $(".switch"),
    card = $(".welcome"),
    enter = $(".enter");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const previousFocus = document.activeElement,
    abort = new AbortController(),
    timers = new Set();
  const light = new LightField({
    ...presets[options.preset || "moonlit-attic"],
    ...options.lighting,
    motion: !reduced && options.lighting?.motion !== false,
  });
  const atmosphere = new Atmosphere($(".lighting"), $(".dust"), light);
  const engine = new WebEngine($(".silk"), light, {
    ...growthForDays(options.days, options.detail),
    ...options.web,
    physics: !reduced && options.web?.physics !== false,
  });
  let state = "dark",
    raf = 0,
    last = 0,
    lastLight = -Infinity,
    drag = false,
    destroyed = false;
  const emit = (name) =>
    host.dispatchEvent(
      new CustomEvent(`cobbwebs:${name}`, {
        bubbles: true,
        composed: true,
        detail: { days: options.days ?? 127 },
      }),
    );
  const later = (fn, delay) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!destroyed) fn();
    }, delay);
    timers.add(id);
  };
  const listen = (target, type, fn) =>
    target.addEventListener(type, fn, { signal: abort.signal });
  function resize() {
    const width = innerWidth,
      height = innerHeight,
      dpr = Math.min(devicePixelRatio || 1, 2);
    light.resize(width, height);
    atmosphere.resize(width, height, dpr);
    engine.resize(width, height, dpr);
    lastLight = -Infinity;
    if (reduced) {
      atmosphere.drawMask();
      engine.frame(0);
    }
  }
  function tick(time) {
    if (destroyed || state !== "dark") return;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    if (time - lastLight > 80) {
      light.update(time);
      atmosphere.drawMask();
      const r = sw.getBoundingClientRect();
      sw.style.setProperty(
        "--switch-light",
        0.25 +
          light.sample(r.x + r.width / 2, r.y + r.height / 2).intensity * 0.8,
      );
      lastLight = time;
    }
    atmosphere.drawDust(time, dt);
    engine.frame(dt);
    raf = requestAnimationFrame(tick);
  }
  function focusables() {
    return [...root.querySelectorAll("button")].filter(
      (b) => !b.disabled && !b.closest("[hidden]"),
    );
  }
  function turnOn() {
    if (state !== "dark") return;
    state = "lighting";
    cancelAnimationFrame(raf);
    engine.release();
    sw.disabled = true;
    room.classList.add("lit");
    emit("lit");
    if (options.bugs !== false && !reduced)
      scatterBugs($(".bugs"), innerWidth, innerHeight);
    later(
      () => {
        state = "lit";
        card.hidden = false;
        card.querySelector("p").textContent = (
          options.message ??
          "It's been {days} days since you were last here. We kept the lights off for you."
        ).replaceAll("{days}", String(options.days ?? 127));
        enter.textContent = options.button ?? "Enter site →";
        enter.focus();
      },
      reduced ? 0 : 850,
    );
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    state = "destroyed";
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    timers.clear();
    abort.abort();
    for (const animation of root.getAnimations?.() ?? []) animation.cancel();
    host.remove();
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
    options.onDestroy?.();
  }
  function exit(reason = "skipped") {
    if (state === "exiting" || destroyed) return;
    state = "exiting";
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    timers.clear();
    engine.release();
    emit(reason);
    room.classList.add("gone");
    later(destroy, reduced ? 0 : 650);
  }
  listen(sw, "click", turnOn);
  listen(sw, "keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      turnOn();
    }
  });
  listen(enter, "click", () => exit("entered"));
  listen($(".skip"), "click", () => exit());
  listen(document, "keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      exit();
    }
    if (e.key === "Tab" && !options.allowExternalControls) {
      const list = focusables(),
        index = list.indexOf(root.activeElement);
      e.preventDefault();
      list[
        (index + (e.shiftKey ? -1 : 1) + list.length) % list.length
      ]?.focus();
    }
  });
  listen(document, "focusin", (e) => {
    if (
      !destroyed &&
      state !== "exiting" &&
      e.target !== host &&
      !options.allowExternalControls
    )
      sw.disabled ? (card.hidden ? $(".skip") : enter).focus() : sw.focus();
  });
  listen(room, "pointermove", (e) => {
    if (state === "dark" && !e.target.closest("button,.welcome"))
      engine.move(e.clientX, e.clientY, drag);
  });
  listen(room, "pointerdown", (e) => {
    if (e.target.closest("button,.welcome")) return;
    drag = true;
    engine.release();
    engine.move(e.clientX, e.clientY, true);
    room.setPointerCapture(e.pointerId);
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"])
    listen(room, type, () => {
      drag = false;
      engine.release();
    });
  listen(window, "blur", () => engine.release());
  listen(window, "resize", resize);
  listen(document, "visibilitychange", () => {
    cancelAnimationFrame(raf);
    last = 0;
    engine.release();
    if (!document.hidden && state === "dark" && !reduced)
      raf = requestAnimationFrame(tick);
  });
  resize();
  sw.focus();
  emit("shown");
  if (reduced) turnOn();
  else raf = requestAnimationFrame(tick);
  return {
    host,
    engine,
    light,
    turnOn,
    destroy,
    skip: () => exit(),
    get state() {
      return state;
    },
    updateWeb(config) {
      if (destroyed) return;
      engine.generate({
        ...config,
        physics: !reduced && (config.physics ?? engine.config.physics),
      });
      engine.frame(0);
    },
    updateLight(config) {
      if (destroyed) return;
      light.configure({
        ...config,
        motion: !reduced && (config.motion ?? light.options.motion),
      });
      lastLight = -Infinity;
      if (reduced) {
        light.update(0);
        atmosphere.drawMask();
        engine.frame(0);
      }
    },
  };
}
