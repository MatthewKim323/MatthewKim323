import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const profile = JSON.parse(await readFile(new URL('../../data/profile.json', import.meta.url), 'utf8'));
const canvasSelector = '#ocean-canvas';
const portfolioProjects = profile.projects.filter(project => project.category !== 'tool');
const featuredCount = portfolioProjects.filter(project => project.featured || project.category === 'featured').length;
const archiveCount = profile.projects.filter(project => !project.featured && project.category === 'archive').length;
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

test('every portfolio project loads with correct content and links, and the archive expands', async ({ page }) => {
  await openProfile(page);
  expect(portfolioProjects).toHaveLength(16);
  await expect(page.locator('article[data-project]')).toHaveCount(16);
  await expect(page.locator('#featured-projects article')).toHaveCount(featuredCount);
  await expect(page.locator('#archive-projects article')).toHaveCount(archiveCount);
  await expect(page.locator('#workbench, #tools-list, .project-index, #work-count, #archive-count')).toHaveCount(0);
  await expect(page.locator('#archive-projects')).toBeHidden();
  await page.locator('#archive summary').click();
  await expect(page.locator('#archive')).toHaveAttribute('open', '');
  await expect(page.locator('#archive-projects')).toBeVisible();

  for (const project of portfolioProjects) {
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

test('the complete portfolio remains within a 320px viewport in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openProfile(page);
  await page.locator('#archive summary').click();
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: `Use ${theme} theme` }).click();
    await settleFontsAndLayout(page);
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1);
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1);
    await expect(page.locator('article[data-project]')).toHaveCount(portfolioProjects.length);
    await expect(page.locator('#archive-projects')).toBeVisible();
  }
});

test('pause freezes both animation work and canvas pixels; play resumes and preference persists', async ({ page }) => {
  await openProfile(page);
  await page.getByRole('button', { name: 'Pause ocean animation' }).click();
  await expect(page.locator('.ocean-figure')).toHaveAttribute('data-state', 'paused');
  await expect(page.getByRole('button', { name: 'Play ocean animation' })).toHaveAttribute('aria-pressed', 'true');
  await settleFontsAndLayout(page);
  const frozenCount = await frameCount(page);
  const frozenPixels = await framePixels(page);
  // This interval measures absence of work, rather than waiting for readiness.
  await page.waitForTimeout(300);
  expect(await frameCount(page)).toBe(frozenCount);
  expect(await framePixels(page)).toBe(frozenPixels);

  await page.reload();
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play ocean animation' })).toBeVisible();
  await settleFontsAndLayout(page);
  const restartedCount = await frameCount(page);
  await page.getByRole('button', { name: 'Play ocean animation' }).click();
  await expect(page.getByRole('button', { name: 'Pause ocean animation' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => frameCount(page)).toBeGreaterThan(restartedCount + 2);
});

test('the ocean advances in time and changes its actual rendered pixels', async ({ page }) => {
  await openProfile(page);
  await page.locator(canvasSelector).scrollIntoViewIfNeeded();
  await expect(page.locator('.ocean-figure')).toHaveAttribute('data-state', 'playing');
  const initialCount = await frameCount(page);
  const initialTime = await page.locator(canvasSelector).evaluate(canvas => Number(canvas.dataset.time));
  const initialPixels = await framePixels(page);
  await expect.poll(() => frameCount(page)).toBeGreaterThan(initialCount + 5);
  await expect.poll(() => page.locator(canvasSelector).evaluate(canvas => Number(canvas.dataset.time))).toBeGreaterThan(initialTime);
  await expect.poll(() => framePixels(page)).not.toBe(initialPixels);
});

test('the ocean stage stays at a 2:1 ratio across responsive breakpoints', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openProfile(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await settleFontsAndLayout(page);
    const shape = await page.locator('#ocean-stage').evaluate(stage => {
      const rect = stage.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(shape.width).toBeGreaterThan(0);
    expect(Math.abs(shape.width / shape.height - 2)).toBeLessThan(0.025);
  }
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

test('reduced motion starts still, ignores passive pointer input, and permits deliberate play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openProfile(page);
  await page.locator(canvasSelector).scrollIntoViewIfNeeded();
  await settleFontsAndLayout(page);
  await expect(page.getByRole('button', { name: 'Play ocean animation' })).toBeVisible();
  await expect(page.locator('.ocean-figure')).toHaveAttribute('data-state', 'paused');
  const stillCount = await frameCount(page);
  const stillPixels = await framePixels(page);
  await page.mouse.move(10, 10);
  await page.mouse.move(300, 250);
  await page.waitForTimeout(250);
  expect(await frameCount(page)).toBe(stillCount);
  expect(await framePixels(page)).toBe(stillPixels);
  await expect(page.locator('[data-look]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play ocean animation' }).click();
  await expect(page.locator('.ocean-figure')).toHaveAttribute('data-state', 'playing');
  await expect.poll(() => frameCount(page)).toBeGreaterThan(stillCount + 3);
  await expect.poll(() => framePixels(page)).not.toBe(stillPixels);
});

test('moving the ocean offscreen suspends rendering and returning resumes it', async ({ page }) => {
  await openProfile(page);
  await page.locator('.contact-section').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#ocean-stage').getBoundingClientRect().bottom < 0);
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
  for (const asset of ['/app.mjs', '/styles.css', '/src/ocean-core.mjs']) {
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

test('an unavailable renderer keeps the complete portfolio and static ocean fallback usable', async ({ page }) => {
  await page.route('**/src/ocean-core.mjs', route => route.fulfill({ status: 503, contentType: 'text/javascript', body: '' }));
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-profile-loaded', 'true');
  await expect(page.locator('article[data-project]')).toHaveCount(portfolioProjects.length);
  await expect(page.locator('#ocean-fallback')).toBeVisible();
  await expect(page.locator(canvasSelector)).toBeHidden();
  await expect(page.locator('#motion-toggle')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'built. shipped. still building.' })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every portfolio project, native archive disclosure and the static ocean remain available', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('article[data-project]')).toHaveCount(portfolioProjects.length);
    await expect(page.locator('#featured-projects article')).toHaveCount(featuredCount);
    await expect(page.locator('#workbench, #tools-list, .project-index, #work-count, #archive-count')).toHaveCount(0);
    await expect(page.locator('#ocean-fallback')).toBeVisible();
    await expect(page.locator(canvasSelector)).toBeHidden();
    await expect(page.locator('#motion-toggle')).toBeHidden();
    await expect(page.locator('.theme-picker')).toBeHidden();
    await expect(page.locator('#archive-projects')).toBeHidden();
    await page.locator('#archive summary').click();
    await expect(page.locator('#archive-projects')).toBeVisible();
    await expect(page.locator('#archive-projects article')).toHaveCount(archiveCount);
    for (const project of portfolioProjects) {
      const row = page.locator(`article[data-project="${project.id}"]`);
      await expect(row.locator('h3')).toContainText(project.name);
      await expect(row.locator('p').first()).toHaveText(project.description);
    }
  });
});
