const DAY = 86400000;
/** Storage is injected so extensions can supply a different visit policy later. */
export function visitDecision({
  now = Date.now(),
  minDays = 14,
  test = false,
  storage,
  session,
  key = "cobb-webs:last-visit",
} = {}) {
  let previous = null,
    seen = false;
  try {
    previous = Number(storage?.getItem(key)) || null;
    seen = session?.getItem(key) === "shown";
    storage?.setItem(key, String(now));
  } catch {
    /* Storage-disabled sites still support explicit previews. */
  }
  const days = previous ? Math.max(0, Math.floor((now - previous) / DAY)) : 0;
  const show = test || !!(previous && days >= minDays && !seen);
  if (show)
    try {
      session?.setItem(key, "shown");
    } catch {
      /* Session storage is optional. */
    }
  return { show, days };
}
