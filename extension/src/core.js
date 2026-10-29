/** Pure extension logic shared by the popup, options page, background and content script. */
export const DAY = 86400000;
/** Page loads closer together than this belong to the same visit. */
export const VISIT_GAP = 30 * 60 * 1000;
export const DEFAULTS = {
  minDays: 3,
  fullAt: 30,
  shape: "ease",
  heaviness: 100,
  light: 85,
  silk: "silver",
  bugs: true,
  physics: true,
};
export const SHAPES = {
  linear: "Steady",
  ease: "Slow start",
  log: "Fast start",
};
export const SILKS = {
  light: "Pale",
  silver: "Silver",
  white: "White",
  gold: "Gold",
};

export const siteKey = (origin) => `site:${origin}`;

/** Only regular web pages can host the scene. */
export function originOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) &&
      u.hostname !== "chromewebstore.google.com"
      ? u.origin
      : null;
  } catch {
    return null;
  }
}

/** Cobwebs is on for every site unless the user turned it off there. */
export const isOn = (site) => !site?.disabled;

/** Visit history only; a site's on/off choice and settings are kept. */
export function forgetVisits({ lastVisit, previousVisit, lastAway, ...rest }) {
  return rest;
}
const hasChoices = (site) => !!site?.disabled || !!site?.settings;

export const MAX_SITES = 20000;
/** Keys of the least recently visited plain records beyond `max` sites. */
export function sitesToForget(stored, max = MAX_SITES) {
  const sites = Object.entries(stored).filter(([k]) => k.startsWith("site:"));
  if (sites.length <= max) return [];
  return sites
    .filter(([, site]) => !hasChoices(site))
    .sort(([, a], [, b]) => (a.lastVisit ?? 0) - (b.lastVisit ?? 0))
    .slice(0, sites.length - max)
    .map(([k]) => k);
}

export function resolveSettings(defaults, site) {
  return { ...DEFAULTS, ...defaults, ...site?.settings };
}

/**
 * Records a page load. A new visit starts after VISIT_GAP of no loads; its
 * `days` is the time since the previous visit. Returns the updated site.
 */
export function recordVisit(site = {}, now = Date.now()) {
  const last = Number(site.lastVisit) || 0;
  if (!last)
    return { site: { ...site, lastVisit: now }, days: 0, newVisit: false };
  if (now - last < VISIT_GAP)
    return {
      site: { ...site, lastVisit: now },
      days: site.lastAway ?? 0,
      newVisit: false,
    };
  const days = Math.max(0, Math.floor((now - last) / DAY));
  return {
    site: { ...site, lastVisit: now, previousVisit: last, lastAway: days },
    days,
    newVisit: true,
  };
}

export function shouldShow({ days, newVisit }, settings) {
  return newVisit && days >= Math.max(1, settings.minDays);
}

/** Scene options for `createScene`; the web bug is never part of the extension. */
export function sceneOptions(settings, days, detail = "medium") {
  return {
    days,
    detail,
    bugs: settings.bugs,
    cobwebsBug: false,
    growth: {
      startDays: Math.min(settings.minDays, settings.fullAt - 1),
      fullAt: settings.fullAt,
      shape: settings.shape,
      scale: settings.heaviness / 100,
      layered: true,
    },
    web: { silk: settings.silk, physics: settings.physics },
    lighting: { intensity: settings.light },
  };
}
