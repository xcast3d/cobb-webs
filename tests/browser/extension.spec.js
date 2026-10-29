import { test, expect, chromium } from "@playwright/test";
import { execSync } from "node:child_process";

const SITE = "https://cobwebs.test";
const DAY = 86400000;
const PAGE = `<!doctype html><title>Test site</title><body><h1>Host page</h1><p>Content</p></body>`;
let context, worker;

test.beforeAll(async () => {
  execSync("npm run build:extension", { stdio: "ignore" });
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    args: [
      "--disable-extensions-except=extension",
      "--load-extension=extension",
    ],
  });
  await context.route(`${SITE}/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: PAGE }),
  );
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
});
test.afterAll(() => context?.close());

const setSite = (site) =>
  worker.evaluate(
    ([key, site]) => chrome.storage.local.set({ [key]: site }),
    [`site:${SITE}`, site],
  );
const getSite = async () =>
  (
    await worker.evaluate(
      (key) => chrome.storage.local.get(key),
      `site:${SITE}`,
    )
  )[`site:${SITE}`];

test("on by default: first visit is recorded without showing anything", async () => {
  const page = await context.newPage();
  await page.goto(`${SITE}/first`);
  await expect.poll(getSite).toMatchObject({ lastVisit: expect.any(Number) });
  await expect(page.locator("cobwebs-scene, cobwebs-bug")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.children.length)).toBe(2);
  await page.close();
});

test("returning after enough days shows the scene; otherwise the page is untouched", async () => {
  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  await setSite({ lastVisit: Date.now() - DAY });
  await page.goto(SITE);
  await page.waitForTimeout(500);
  await expect(page.locator("cobwebs-scene, cobwebs-bug")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.children.length)).toBe(2);

  await setSite({ lastVisit: Date.now() - 12 * DAY });
  await page.reload();
  await expect(page.locator("cobwebs-scene")).toHaveCount(1);
  await expect(page.locator("cobwebs-bug")).toHaveCount(0);
  await page.screenshot({ path: "test-results/extension-return.png" });
  const stored = await worker.evaluate(
    (k) => chrome.storage.local.get(k),
    `site:${SITE}`,
  );
  expect(stored[`site:${SITE}`].lastAway).toBe(12);

  await page.keyboard.press("Escape");
  await expect(page.locator("cobwebs-scene")).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.locator("cobwebs-scene")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.close();
});

test("replay from the popup shows the scene with the chosen days", async () => {
  const page = await context.newPage();
  await page.goto(SITE);
  await page.bringToFront();
  await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}/*` });
    await chrome.tabs.sendMessage(tab.id, {
      type: "cobwebs:replay",
      days: 200,
    });
  }, SITE);
  await expect(page.locator("cobwebs-scene")).toHaveCount(1);
  await page.getByRole("button", { name: "Turn on the light" }).click();
  await expect(page.getByText("It's been 200 days")).toBeVisible();
  await page.close();
});

test("scene stays visible on pages that hide undefined custom elements", async () => {
  const page = await context.newPage();
  // Reddit hides every unregistered custom element; others go further.
  await page.route(`${SITE}/hostile`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<style>:not(:defined) { visibility: hidden; } body > * { opacity: .2; display: none; position: static; }</style>${PAGE}`,
    }),
  );
  await page.goto(`${SITE}/hostile`);
  await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}/hostile` });
    await chrome.tabs.sendMessage(tab.id, {
      type: "cobwebs:replay",
      days: 30,
    });
  }, SITE);
  const host = page.locator("cobwebs-scene");
  await expect(host).toHaveCount(1);
  expect(
    await host.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.visibility, s.display, s.opacity, s.position];
    }),
  ).toEqual(["visible", "block", "1", "fixed"]);
  await expect(
    page.getByRole("button", { name: "Turn on the light" }),
  ).toBeVisible();
  await page.close();
});

test("reduced motion: static lit scene, no bugs or moving light", async () => {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(SITE);
  await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}/*` });
    await chrome.tabs.sendMessage(tab.id, {
      type: "cobwebs:replay",
      days: 60,
    });
  }, SITE);
  // The light is already on and the welcome card shows immediately.
  await expect(page.getByText("It's been 60 days")).toBeVisible();
  const host = page.locator("cobwebs-scene");
  expect(
    await host.evaluate((el) => [
      el.shadowRoot.querySelectorAll(".bugs > *").length,
      el.shadowRoot.getAnimations().length,
    ]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Enter site" }).click();
  await expect(host).toHaveCount(0);
  await page.close();
});

/** Opens the popup as a tab, pointed at a real site tab. */
async function openPopup(siteTab) {
  const id = new URL(worker.url()).host;
  const tabId = await worker.evaluate(
    async (url) => (await chrome.tabs.query({ url: `${url}/*` }))[0].id,
    SITE,
  );
  const popup = await context.newPage();
  await popup.addInitScript(
    ([tabId, url]) => {
      chrome.tabs.query = async () => [{ id: tabId, url }];
      window.close = () => {};
    },
    [tabId, siteTab.url()],
  );
  await popup.goto(`chrome-extension://${id}/popup.html`);
  return popup;
}

test("popup replays, turns a site off, and options turns it back on", async () => {
  const site = await context.newPage();
  await site.goto(SITE);
  const popup = await openPopup(site);
  await expect(popup.getByText("cobwebs.test")).toBeVisible();
  await expect(popup.getByLabel("Gather cobwebs on this site")).toBeChecked();
  await popup.locator("#days").fill("90");
  await popup.getByRole("button", { name: "Replay on this page" }).click();
  await expect(site.locator("cobwebs-scene")).toHaveCount(1);
  await site.keyboard.press("Escape");
  await expect(site.locator("cobwebs-scene")).toHaveCount(0);

  await popup.getByLabel("Gather cobwebs on this site").uncheck();
  await expect(popup.getByText("Off for this site")).toBeVisible();
  await expect.poll(getSite).toMatchObject({ disabled: true });
  await setSite({ ...(await getSite()), lastVisit: Date.now() - 40 * DAY });
  await site.reload();
  await site.waitForTimeout(500);
  await expect(site.locator("cobwebs-scene")).toHaveCount(0);

  await popup.goto(popup.url().replace("popup.html", "options.html"));
  await expect(popup.getByText("Turned off for:")).toBeVisible();
  await popup.setViewportSize({ width: 480, height: 820 });
  await popup.screenshot({ path: "test-results/extension-options.png" });
  await popup.getByRole("button", { name: "Turn on" }).click();
  await expect.poll(getSite).not.toHaveProperty("disabled");
  await expect(
    popup.getByText("Turn it off for a site from the toolbar popup."),
  ).toBeVisible();
  await site.close();
  await popup.close();
});

test("popup explains unsupported pages and links to the site", async () => {
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(page.getByText("only runs on regular web pages")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Add Cobwebs to your website/ }),
  ).toHaveAttribute("href", "https://xcast3d.com/cobwebs/?ref=extension");
  await page.close();
});
