import { test, expect } from "@playwright/test";
test("demo controls, brush physics, welcome and cleanup", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(1);
  await page.screenshot({ path: "test-results/desktop-scene.png" });
  await page.getByRole("button", { name: "Tune the scene" }).click();
  await page.locator("#density").fill("80");
  await page.locator("#preset").selectOption("hallway-spill");
  await page.getByRole("button", { name: "Close controls" }).click();
  await page.mouse.move(110, 200);
  await page.mouse.down();
  await page.mouse.move(400, 350, { steps: 30 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Turn on the light" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/welcome.png" });
  await page.getByRole("button", { name: "Enter site" }).click();
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.locator("cobb-webs-scene")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("standalone API isolates host CSS and disposes listeners/timers", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const { show } = await import("/src/index.js");
    const before = document.querySelector(".site").outerHTML;
    const style = document.createElement("style");
    style.textContent =
      "button{background:red!important;font-size:80px!important}canvas{display:none!important}";
    document.head.append(style);
    const trigger = document.querySelector("#replay");
    trigger.focus();
    const s = show({ days: 42, bugs: false });
    const button = s.host.shadowRoot.querySelector(".skip");
    const canvas = s.host.shadowRoot.querySelector(".silk");
    const isolated =
      getComputedStyle(button).fontSize === "11px" &&
      getComputedStyle(canvas).display !== "none";
    s.turnOn();
    s.destroy();
    style.remove();
    return {
      isolated,
      hostUnchanged: before === document.querySelector(".site").outerHTML,
      focus: document.activeElement === trigger,
      count: document.querySelectorAll("cobb-webs-scene").length,
    };
  });
  expect(result).toEqual({
    isolated: true,
    hostUnchanged: true,
    focus: true,
    count: 0,
  });
  await page.waitForTimeout(1000);
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
});
test("mobile and reduced motion can enter without animation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-reduced.png" });
  await page.getByRole("button", { name: "Enter site" }).click();
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
});
test("built classic embed auto-initializes without demo markup", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await page.evaluate(() => {
    document.body.innerHTML =
      '<main><button id="host-button">Host site</button></main>';
    const script = document.createElement("script");
    script.src = "/dist/embed/cobb-webs.min.js";
    script.dataset.cobbWebs = "";
    script.dataset.test = "true";
    script.dataset.days = "127";
    document.body.append(script);
  });
  await expect(page.locator("cobb-webs-scene")).toHaveCount(1);
  await page.getByRole("button", { name: "Skip scene" }).click();
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await expect(page.locator("#host-button")).toHaveText("Host site");
});

test("exports and mobile dark scene remain usable after resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: "test-results/mobile-dark.png" });
  await page.getByRole("button", { name: "Tune the scene" }).click();
  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  expect((await svgDownload).suggestedFilename()).toMatch(/\.svg$/);
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await pngDownload).suggestedFilename()).toMatch(/\.png$/);
  await page.getByRole("button", { name: "Close controls" }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Turn on the light" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
});

test("standalone art tool has no scene and exports custom-sized artwork", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/generator.html");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Spin something new." }),
  ).toBeVisible();
  await page.locator("#width").fill("800");
  await page.locator("#height").fill("600");
  await page.getByRole("button", { name: "Apply dimensions" }).click();
  await expect(page.locator("canvas")).toHaveAttribute("width", "800");
  await page.locator("#background").selectOption("checker");
  const result = await page.evaluate(async () => {
    const { createGenerator } = await import("/src/generator/index.js");
    const tool = createGenerator(document.createElement("canvas"), {
      width: 800,
      height: 600,
    });
    const svg = tool.svg(),
      blob = await tool.png(),
      bitmap = await createImageBitmap(blob);
    return {
      svg: svg.includes('viewBox="0 0 800 600"'),
      width: bitmap.width,
      height: bitmap.height,
    };
  });
  expect(result).toEqual({ svg: true, width: 1600, height: 1200 });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save settings" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page.screenshot({ path: "test-results/art-generator.png" });
  expect(errors).toEqual([]);
});
