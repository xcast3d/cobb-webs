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
test("installation modal copies instructions and downloads the embed", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add it to your site" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add Cobb Webs to your site.",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#embed-code")).toContainText("data-cobb-webs");
  await expect(dialog.locator("#embed-code")).toContainText(
    "https://xcast3d.com/cobb-webs/embed/cobb-webs.min.js",
  );
  await expect(dialog.locator("#embed-code")).toContainText(
    'data-cobbwebsbug="true"',
  );
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JavaScript" }).click();
  expect((await download).suggestedFilename()).toBe("cobb-webs.min.js");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(dialog).not.toBeVisible();
});
test("demo credits Xcast3D", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  const credit = page.getByRole("link", {
    name: "Built with love by Xcast3D",
  });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute("href", "https://xcast3d.com/");
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
      "button{background:red!important;font-size:80px!important}canvas{display:none!important}cobb-webs-scene{--cobb-card-background:rgb(1, 2, 3);--cobb-card-radius:24px;--cobb-button-background:rgb(4, 5, 6)}";
    document.head.append(style);
    const trigger = document.querySelector("#replay");
    trigger.focus();
    const s = show({ days: 42, bugs: false });
    const button = s.host.shadowRoot.querySelector(".skip");
    const card = s.host.shadowRoot.querySelector(".welcome");
    const enter = s.host.shadowRoot.querySelector(".enter");
    const canvas = s.host.shadowRoot.querySelector(".silk");
    const isolated =
      getComputedStyle(button).fontSize === "11px" &&
      getComputedStyle(canvas).display !== "none";
    const themeValues = {
      cardBackground: getComputedStyle(card).backgroundColor,
      cardRadius: getComputedStyle(card).borderRadius,
      buttonBackground: getComputedStyle(enter).backgroundColor,
    };
    s.turnOn();
    s.destroy();
    style.remove();
    return {
      isolated,
      themeValues,
      hostUnchanged: before === document.querySelector(".site").outerHTML,
      focus: document.activeElement === trigger,
      count: document.querySelectorAll("cobb-webs-scene").length,
    };
  });
  expect(result).toEqual({
    isolated: true,
    themeValues: {
      cardBackground: "rgb(1, 2, 3)",
      cardRadius: "24px",
      buttonBackground: "rgb(4, 5, 6)",
    },
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
  await expect(page.locator("#studio-actions")).not.toBeVisible();
  await page.getByRole("button", { name: "Open studio menu" }).click();
  await expect(page.locator("#studio-actions")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View on GitHub" }),
  ).toHaveAttribute("href", "https://github.com/xcast3d/cobb-webs");
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

test("optional web bug tunes, replays, and survives scene dismissal", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await page.evaluate(async () => {
    const { show } = await import("/src/index.js");
    show({ days: 127, bugs: false, cobbwebsbug: true });
  });
  const bug = page.locator("cobb-webs-bug");
  await expect(bug).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Cobb Webs settings" }).click();
  await page.getByRole("slider", { name: "Web density" }).fill("82");
  await page.getByRole("button", { name: "Replay cobwebs" }).click();
  await expect(page.locator("cobb-webs-scene")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await expect(bug).toHaveCount(1);
  await page.evaluate(async () => (await import("/src/index.js")).destroy());
  await expect(bug).toHaveCount(0);
});

test("first-visit bug preview uses minimum days instead of demo fallback", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await page.evaluate(async () => {
    const api = await import("/src/index.js");
    api.destroy();
    localStorage.removeItem("cobb-webs:last-visit");
    sessionStorage.removeItem("cobb-webs:last-visit");
    api.init({ minDays: 1, cobbwebsbug: true, bugs: false });
  });
  await expect(page.locator("cobb-webs-scene")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Cobb Webs settings" }).click();
  await page.getByRole("button", { name: "Replay cobwebs" }).click();
  await page.getByRole("button", { name: "Turn on the light" }).click();
  await expect(page.locator("cobb-webs-scene .welcome p")).toContainText(
    "It's been 1 day since",
  );
});

test("always mode bypasses visits and supports custom card labels", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    localStorage.removeItem("cobb-webs:last-visit");
    sessionStorage.removeItem("cobb-webs:last-visit");
    const script = document.createElement("script");
    script.src = "/dist/embed/cobb-webs.min.js";
    script.dataset.cobbWebs = "";
    script.dataset.always = "true";
    script.dataset.eyebrow = "Something has been waiting";
    script.dataset.title = "Welcome in.";
    script.dataset.button = "Come inside →";
    script.dataset.bugs = "false";
    document.body.append(script);
  });
  await expect(page.locator("cobb-webs-scene")).toHaveCount(1);
  await page.getByRole("button", { name: "Turn on the light" }).click();
  await expect(page.getByText("Something has been waiting")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welcome in." }),
  ).toBeVisible();
  await expect(page.getByText("We kept the lights off for you.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Come inside" })).toBeVisible();
});

test("exports and mobile dark scene remain usable after resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: "test-results/mobile-dark.png" });
  await page.getByRole("button", { name: "Open studio menu" }).click();
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

test("replay refreshes web and lighting controls and restores moving light", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const read = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [
          "seed",
          "layers",
          "coverage",
          "density",
          "structure",
          "variation",
          "sag",
          "clusters",
          "thickness",
          "position",
          "direction",
          "intensity",
          "warmth",
          "fill",
        ].map((id) => [id, document.getElementById(id).value]),
      ),
    );
  const before = await read();
  await page.getByRole("button", { name: "Tune the scene" }).click();
  await page.locator("#motion").uncheck();
  await page.getByRole("button", { name: "Replay" }).click();
  const after = await read();
  expect(after.seed).not.toEqual(before.seed);
  expect([after.layers, after.density, after.coverage]).not.toEqual([
    before.layers,
    before.density,
    before.coverage,
  ]);
  expect([after.position, after.direction, after.warmth]).not.toEqual([
    before.position,
    before.direction,
    before.warmth,
  ]);
  await expect(page.locator("#motion")).toBeChecked();
  await expect(page.locator("#preset")).toHaveValue("custom");
  for (const id of ["layers", "density", "position", "intensity"])
    expect(
      await page
        .locator(`#${id}`)
        .evaluate(
          (el) => el.previousElementSibling.querySelector("output").value,
        ),
    ).toEqual(after[id]);
  const pixels = () =>
    page.locator("cobb-webs-scene canvas.lighting").evaluate(async (c) => {
      const pixels = c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height).data;
      const digest = await crypto.subtle.digest("SHA-256", pixels);
      return Array.from(new Uint8Array(digest));
    });
  const initial = await pixels();
  await page.waitForTimeout(1500);
  expect(await pixels()).not.toEqual(initial);
  await page.locator("#motion").uncheck();
  await page.waitForTimeout(120);
  const frozen = await pixels();
  await page.waitForTimeout(300);
  expect(await pixels()).toEqual(frozen);
});

test("scene silk defaults to lighting color across the wider temperature range", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tune the scene" }).click();
  await expect(page.locator("#silk")).toHaveValue("light");
  await page.locator("#motion").uncheck();
  await page.locator("#fill").fill("0");
  await page.locator("#warmth").fill("0");
  await page.waitForTimeout(120);
  await page.screenshot({ path: "test-results/cool-light.png" });
  await page.locator("#warmth").fill("100");
  await page.waitForTimeout(120);
  await page.screenshot({ path: "test-results/warm-light.png" });
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.locator("#silk")).toHaveValue("light");
});

test("dust glints change brightness in a stationary beam and reuse glow sprites", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { Atmosphere } = await import("/src/lighting/atmosphere.js");
    const { LightField } = await import("/src/lighting/light-field.js");
    const light = new LightField({
      position: 50,
      direction: 50,
      intensity: 100,
      fill: 0,
      motion: false,
    });
    light.resize(160, 100);
    const mask = document.createElement("canvas"),
      dust = document.createElement("canvas");
    const atmosphere = new Atmosphere(mask, dust, light);
    atmosphere.resize(160, 100, 1);
    atmosphere.motes.forEach((m) => {
      m.x = 80;
      m.y = 50;
    });
    atmosphere.drawDust(0, 0);
    const before = Array.from(
      atmosphere.dctx.getImageData(0, 0, 160, 100).data,
    );
    const sprites = atmosphere.glows.size;
    atmosphere.drawDust(1500, 0);
    const after = Array.from(atmosphere.dctx.getImageData(0, 0, 160, 100).data);
    return {
      changed: before.some((v, i) => v !== after[i]),
      sprites,
      reused: sprites === atmosphere.glows.size,
      alpha: atmosphere.dctx.globalAlpha,
      blend: atmosphere.dctx.globalCompositeOperation,
    };
  });
  expect(result.changed).toBe(true);
  expect(result.sprites).toBeGreaterThan(0);
  expect(result.reused).toBe(true);
  expect(result.alpha).toBe(1);
  expect(result.blend).toBe("source-over");
});
