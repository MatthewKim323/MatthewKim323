import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const profile = JSON.parse(await readFile(new URL('../../data/profile.json', import.meta.url), 'utf8'));
const canvasSelector = '#bot-canvas';
const frameCount = page => page.locator(canvasSelector).evaluate(canvas => Number(canvas.dataset.frames));
const framePixels = page => page.locator(canvasSelector).evaluate(canvas => canvas.toDataURL());

async function settleFontsAndLayout(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function openProfile(page) {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-profile-loaded', 'true');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect.poll(() => frameCount(page)).toBeGreaterThan(0);
  await settleFontsAndLayout(page);
}

test('all 22 projects load with their correct content and links, and the archive expands', async ({ page }) => {
  await openProfile(page);
  expect(profile.projects).toHaveLength(22);
  await expect(page.locator('article[data-project]')).toHaveCount(22);
  await expect(page.locator('#featured-projects article')).toHaveCount(6);
  await expect(page.locator('#archive-projects article')).toHaveCount(10);
  await expect(page.locator('#tools-list article')).toHaveCount(6);
  await expect(page.locator('#archive-projects')).toBeHidden();
  await page.locator('#archive summary').click();
  await expect(page.locator('#archive')).toHaveAttribute('open', '');
  await expect(page.locator('#archive-projects')).toBeVisible();

  for (const project of profile.projects) {
    const row = page.locator(`article[data-project="${project.id}"]`);
    await expect(row.locator('h3')).toContainText(project.name);
    await expect(row.locator('p').first()).toHaveText(project.description);
    if (project.url) await expect(row.locator('h3 a')).toHaveAttribute('href', project.url);
    else await expect(row.locator('h3 a')).toHaveCount(0);
  }
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport + 1);
  await page.locator('#archive summary').click();
  await expect(page.locator('#archive-projects')).toBeHidden();
});

test('pause freezes both animation work and canvas pixels; play resumes and preference persists', async ({ page }) => {
  await openProfile(page);
  await page.getByRole('button', { name: 'Pause companion animation' }).click();
  await expect(page.locator('.bot-figure')).toHaveAttribute('data-state', 'paused');
  await expect(page.getByRole('button', { name: 'Play companion animation' })).toHaveAttribute('aria-pressed', 'true');
  await settleFontsAndLayout(page);
  const frozenCount = await frameCount(page);
  const frozenPixels = await framePixels(page);
  // This interval measures absence of work, rather than waiting for readiness.
  await page.waitForTimeout(300);
  expect(await frameCount(page)).toBe(frozenCount);
  expect(await framePixels(page)).toBe(frozenPixels);

  await page.reload();
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play companion animation' })).toBeVisible();
  await settleFontsAndLayout(page);
  const restartedCount = await frameCount(page);
  await page.getByRole('button', { name: 'Play companion animation' }).click();
  await expect(page.getByRole('button', { name: 'Pause companion animation' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => frameCount(page)).toBeGreaterThan(restartedCount + 2);
});

test('pointer or touch tracking changes head direction and actual rendered pixels', async ({ page }, testInfo) => {
  await openProfile(page);
  await page.locator(canvasSelector).scrollIntoViewIfNeeded();
  const bounds = await page.locator('#bot-stage').boundingBox();
  expect(bounds).not.toBeNull();
  const input = async fraction => {
    const x = bounds.x + bounds.width * fraction;
    const y = bounds.y + bounds.height * 0.5;
    if (testInfo.project.use.isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.move(x, y);
  };
  await input(0.15);
  await expect(page.locator('.bot-figure')).toHaveAttribute('data-state', 'tracking');
  await expect.poll(() => page.locator(canvasSelector).evaluate(canvas => Number(canvas.dataset.yaw))).toBeLessThan(-0.15);
  const left = await framePixels(page);
  await input(0.85);
  await expect.poll(() => page.locator(canvasSelector).evaluate(canvas => Number(canvas.dataset.yaw))).toBeGreaterThan(0.15);
  expect(await framePixels(page)).not.toBe(left);
});

test('explicit light and dark themes persist across reload, and system mode can be restored', async ({ page }) => {
  await openProfile(page);
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: `Use ${theme} theme` }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.reload();
    await expect(page.getByRole('button', { name: `Use ${theme} theme` })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await page.evaluate(() => localStorage.getItem('matt-theme'))).toBe(theme);
  }
  await page.getByRole('button', { name: 'Use system theme' }).click();
  await expect(page.getByRole('button', { name: 'Use system theme' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f4f2eb');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0d1117');
});

test('reduced motion starts still, ignores passive pointer input, and supports immediate keyboard poses', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openProfile(page);
  await page.locator(canvasSelector).scrollIntoViewIfNeeded();
  await settleFontsAndLayout(page);
  await expect(page.getByRole('button', { name: 'Play companion animation' })).toBeVisible();
  const stillCount = await frameCount(page);
  const stillPixels = await framePixels(page);
  await page.mouse.move(10, 10);
  await page.mouse.move(300, 250);
  await page.waitForTimeout(250);
  expect(await frameCount(page)).toBe(stillCount);
  expect(await framePixels(page)).toBe(stillPixels);

  const right = page.getByRole('button', { name: 'Make the companion look right' });
  await right.focus();
  await right.press('Enter');
  await expect(page.locator(canvasSelector)).toHaveAttribute('data-yaw', '0.550');
  expect(await framePixels(page)).not.toBe(stillPixels);
  const posedCount = await frameCount(page);
  await page.waitForTimeout(250);
  expect(await frameCount(page)).toBe(posedCount);
  await page.getByRole('button', { name: 'Return the companion to idle' }).press('Enter');
  await expect(page.locator(canvasSelector)).toHaveAttribute('data-yaw', '0.000');
  await page.getByRole('button', { name: 'Play companion animation' }).click();
  await expect.poll(() => frameCount(page)).toBeGreaterThan(posedCount + 2);
});

test('moving the companion offscreen suspends rendering and returning resumes it', async ({ page }) => {
  await openProfile(page);
  await page.locator('.contact-section').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#bot-stage').getBoundingClientRect().bottom < 0);
  await settleFontsAndLayout(page);
  const suspended = await frameCount(page);
  await page.waitForTimeout(300);
  expect(await frameCount(page)).toBe(suspended);
  await page.locator(canvasSelector).scrollIntoViewIfNeeded();
  await expect.poll(() => frameCount(page)).toBeGreaterThan(suspended + 1);
});

test('loads its complete same-origin runtime without broken resources or browser errors', async ({ page, baseURL }) => {
  const failures = [], loaded = [], errors = [];
  const origin = new URL(baseURL).origin;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (new URL(response.url()).origin !== origin) return;
    loaded.push(response.url());
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin) failures.push(`${request.failure()?.errorText} ${request.url()}`);
  });
  await openProfile(page);
  await page.waitForLoadState('networkidle');
  for (const asset of ['/app.mjs', '/styles.css', '/src/bot-core.mjs']) {
    expect(loaded.some(url => url.endsWith(asset)), `required asset loaded: ${asset}`).toBe(true);
  }
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

for (const theme of ['light', 'dark']) {
  test(`expanded portfolio meets WCAG 2.1 AA checks in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openProfile(page);
    await page.getByRole('button', { name: `Use ${theme} theme` }).click();
    await page.locator('#archive summary').click();
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(report.violations, JSON.stringify(report.violations.map(violation => ({
      id: violation.id, impact: violation.impact, description: violation.description,
      nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
    })), null, 2)).toEqual([]);
  });
}

test('an unavailable renderer keeps the complete portfolio and static companion fallback usable', async ({ page }) => {
  await page.route('**/src/bot-core.mjs', route => route.fulfill({ status: 503, contentType: 'text/javascript', body: '' }));
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-profile-loaded', 'true');
  await expect(page.locator('article[data-project]')).toHaveCount(22);
  await expect(page.locator('#bot-fallback')).toBeVisible();
  await expect(page.locator(canvasSelector)).toBeHidden();
  await expect(page.locator('#motion-toggle')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'built. shipped. still building.' })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all 22 projects, native archive disclosure and the static companion remain available', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('article[data-project]')).toHaveCount(22);
    await expect(page.locator('#featured-projects article')).toHaveCount(6);
    await expect(page.locator('#tools-list article')).toHaveCount(6);
    await expect(page.locator('#bot-fallback')).toBeVisible();
    await expect(page.locator(canvasSelector)).toBeHidden();
    await expect(page.locator('#motion-toggle')).toBeHidden();
    await expect(page.locator('.theme-picker')).toBeHidden();
    await expect(page.locator('#archive-projects')).toBeHidden();
    await page.locator('#archive summary').click();
    await expect(page.locator('#archive-projects')).toBeVisible();
    await expect(page.locator('#archive-projects article')).toHaveCount(10);
    for (const project of profile.projects) {
      const row = page.locator(`article[data-project="${project.id}"]`);
      await expect(row.locator('h3')).toContainText(project.name);
      await expect(row.locator('p').first()).toHaveText(project.description);
    }
  });
});
