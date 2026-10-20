import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// These tests exercise the existing hero sequence underneath the session intro.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('milestone-opening-seen-v1', '1'));
});

test('the image stays visible between decorative shutters and the sequence finishes', async ({ page }) => {
  await page.goto('/');
  const initial = await page.locator('.hero-media-inner').evaluate((el) => {
    const left = getComputedStyle(el, '::before');
    const right = getComputedStyle(el, '::after');
    const width = el.getBoundingClientRect().width;
    return { left: left.animationName, right: right.animationName, exposed: 1 - (parseFloat(left.width) + parseFloat(right.width)) / width, pointer: left.pointerEvents };
  });
  expect(initial.left).toBe('m-shutter-left');
  expect(initial.right).toBe('m-shutter-right');
  expect(initial.exposed).toBeGreaterThanOrEqual(0.51);
  expect(initial.pointer).toBe('none');
  await page.waitForFunction(() => document.getAnimations().filter((a) => a.effect?.target?.closest('.hero-media')).every((a) => a.playState === 'finished'));
  const final = await page.locator('.hero-media-inner').evaluate((el) => {
    return ['::before', '::after'].map((pseudo) => {
      const style = getComputedStyle(el, pseudo);
      return Math.abs(new DOMMatrix(style.transform).m41) / parseFloat(style.width);
    });
  });
  expect(final.every((offset) => offset > 1)).toBe(true);
  expect(await page.locator('.hero-image').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeCloseTo(1, 4);
});

test('starting the postcode form immediately settles the copy without waiting for animation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#planning-postcode').focus();
  expect(await page.locator('.postcode-entry').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.locator('#planning-postcode').evaluate((el) => el.blur());
  expect(await page.locator('.postcode-entry').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.locator('#planning-postcode').fill('2088');
  await page.getByRole('button', { name: 'Start my plan' }).click();
  await expect(page).toHaveURL(/\/plan-your-renovation\?postcode=2088/);
});

test('reduced motion removes shutters and shows the final image and heading immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const pseudo of ['::before', '::after']) {
    expect(await page.locator('.hero-media-inner').evaluate((el, p) => getComputedStyle(el, p).content, pseudo)).toBe('none');
  }
  for (const selector of ['.hero-image', '.hero h1 .h-line > span', '.postcode-entry']) {
    expect(await page.locator(selector).first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  }
  await expect(page.locator('.hero h1')).toBeVisible();
});

test('the opening completes with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForTimeout(2000);
  await expect(page.locator('.hero h1')).toBeVisible();
  await expect(page.locator('#planning-postcode')).toBeVisible();
  await expect.poll(() => page.locator('.hero-image').evaluate((el) => Math.round(new DOMMatrix(getComputedStyle(el).transform).m11 * 10000) / 10000)).toBe(1);
  await context.close();
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
  test(`the opening causes no horizontal overflow or layout shift at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      window.openingCLS = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.openingCLS += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/');
    await page.waitForTimeout(2100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => window.openingCLS)).toBeLessThan(0.01);
  });
}

test('the completed opening preserves accessible navigation and image disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForTimeout(2100);
  await expect(page.locator('.hero-chip')).toContainText('MILESTONE WORK');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('[data-menu]')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu]')).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});
