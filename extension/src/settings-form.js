import { SHAPES, SILKS } from "./core.js";

const ranges = [
  [
    "minDays",
    "Show after",
    1,
    60,
    (v) => `${v} ${v == 1 ? "day" : "days"} away`,
  ],
  ["fullAt", "Fully overgrown at", 7, 365, (v) => `${v} days`],
  ["heaviness", "Heaviness", 50, 150, (v) => `${v}%`],
  ["light", "Light level", 30, 100, (v) => `${v}`],
];
const options = (map, value) =>
  Object.entries(map)
    .map(
      ([k, label]) =>
        `<option value="${k}"${k === value ? " selected" : ""}>${label}</option>`,
    )
    .join("");

/** Renders the shared settings controls and reports partial changes. */
export function renderSettings(container, values, onChange) {
  container.innerHTML =
    ranges
      .map(
        ([key, label, min, max, fmt]) =>
          `<label class="field"><span>${label} <output data-for="${key}">${fmt(values[key])}</output></span><input type="range" name="${key}" min="${min}" max="${max}" value="${values[key]}"></label>`,
      )
      .join("") +
    `<div class="row"><label class="field"><span>Growth</span><select name="shape">${options(SHAPES, values.shape)}</select></label><label class="field"><span>Silk</span><select name="silk">${options(SILKS, values.silk)}</select></label></div>` +
    `<label class="check"><input type="checkbox" name="bugs"${values.bugs ? " checked" : ""}> Bugs scatter when the light comes on</label>` +
    `<label class="check"><input type="checkbox" name="physics"${values.physics ? " checked" : ""}> Silk reacts to the cursor</label>`;
  const formats = Object.fromEntries(
    ranges.map(([key, , , , fmt]) => [key, fmt]),
  );
  container.addEventListener("input", (event) => {
    const input = event.target;
    if (!input.name) return;
    const value =
      input.type === "checkbox"
        ? input.checked
        : input.type === "range"
          ? Number(input.value)
          : input.value;
    if (formats[input.name])
      container.querySelector(`output[data-for="${input.name}"]`).value =
        formats[input.name](value);
    // Keep "show after" below "fully overgrown at".
    if (input.name === "fullAt" || input.name === "minDays") {
      const min = container.querySelector('[name="minDays"]'),
        full = container.querySelector('[name="fullAt"]');
      if (Number(min.value) >= Number(full.value)) {
        const other = input.name === "fullAt" ? min : full;
        other.value =
          input.name === "fullAt"
            ? Number(full.value) - 1
            : Number(min.value) + 1;
        other.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    onChange({ [input.name]: value });
  });
}
