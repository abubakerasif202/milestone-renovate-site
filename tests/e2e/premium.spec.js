// Brand presentation, motion system and responsive integrity across every generated route.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');
const ROUTES = [...readFileSync(join(PUBLIC, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/milestonerenovate\.com([^<]*)<\/loc>/g)]
  .map((m) => m[1] || '/');
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const STUCK = '.m-reveal:not(.is-in), .m-mask:not(.is-in)';

/** Scroll the whole page in steps so every scroll-triggered element gets its chance to arrive. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
}

test.describe('every route at every breakpoint', () => {
  test.setTimeout(240_000);
  for (const width of WIDTHS) {
    test(`${width}px: no horizontal overflow, script errors or broken images on any route`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
      const problems = [];
      page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`${page.url()} console: ${m.text()}`); });
      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: 'load' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) problems.push(`${route} overflows by ${overflow}px`);
        if (width === 390 || width === 1440) {
          await scrollThrough(page);
          // Lazy images inside hidden panels never start loading, so only judge images the browser has finished with.
          await page.waitForLoadState('networkidle');
          const broken = await page.evaluate(() => [...document.images]
            .filter((img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src))
            .map((img) => img.currentSrc || img.src));
          broken.forEach((src) => problems.push(`${route} broken image ${src}`));
        }
      }
      expect(problems).toEqual([]);
    });
  }
});

test.describe('brand presentation', () => {
  test('the transparent gold logo sits directly on the deep-forest masthead and footer bar, with no tile', async ({ page }) => {
    await page.goto('/');
    const brand = await page.locator('header .brand').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderBottomWidth, header: getComputedStyle(el.closest('header')).backgroundColor };
    });
    expect(brand.bg).toBe('rgba(0, 0, 0, 0)');
    expect(brand.border).toBe('0px');
    expect(brand.header).toBe('rgb(7, 62, 43)');
    await expect(page.locator('header .brand img')).toHaveAttribute('src', '/assets/brand/logo-gold.svg');
    expect(await page.locator('.footer-brand').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    const svg = readFileSync(join(PUBLIC, 'assets', 'brand', 'logo-gold.svg'), 'utf8');
    expect(svg).not.toMatch(/<rect/); // the artwork itself carries no background plate
  });

  test('the masthead keeps its height when the page scrolls (no layout jump)', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('#header').boundingBox();
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(page.locator('#header')).toHaveClass(/is-scrolled/);
    const after = await page.locator('#header').boundingBox();
    expect(after.height).toBe(before.height);
    expect(after.y).toBe(0);
  });

  test('the mobile dock uses SVG icons and the approved phone number', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const dock = page.locator('.mobile-cta-bar');
    await expect(dock.locator('svg')).toHaveCount(2);
    await expect(dock.locator('a[href="tel:1800008883"]')).toContainText('1800 008 883');
    expect(await dock.textContent()).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

test.describe('mobile navigation', () => {
  test('closed menu is out of the tab order and accessibility tree; opening animates in and locks scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const nav = page.locator('#navigation');
    await expect(nav).toBeHidden();
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // logo
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('#navigation').contains(document.activeElement))).toBe(false);
    await page.locator('[data-menu]').click();
    await expect(nav).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/menu-open/);
    // Shift+Tab from the first link wraps to the close button, never escaping the open menu.
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-menu]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/menu-open/);
  });
});

test.describe('motion system', () => {
  test('scroll reveals all arrive and nothing stays hidden', async ({ page }) => {
    for (const route of ['/', '/about', '/services', '/kitchen-renovations', '/inspiration']) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveClass(/motion-ready/);
      await scrollThrough(page);
      await expect(page.locator(STUCK)).toHaveCount(0, { timeout: 5_000 });
    }
  });

  test('reduced motion: no reveal hooks, no parallax and everything is visible immediately', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
    await expect(page.locator('.m-reveal, .m-mask')).toHaveCount(0);
    const hero = await page.locator('.hero-media').evaluate((el) => getComputedStyle(el).translate);
    expect(hero).toBe('none');
    const faq = page.locator('.faq-grid h2');
    await faq.scrollIntoViewIfNeeded();
    expect(await faq.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await context.close();
  });

  test('without JavaScript every section is still visible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(1600); // let the CSS-only hero entrance finish
    const hidden = await page.evaluate(() => [...document.querySelectorAll('main section h2, main .service-tile, main .journey-list li')]
      .filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
    expect(hidden).toBe(0);
    await context.close();
  });

  test('hero headline is split into masked lines that still read as one heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero h1 .h-line')).toHaveCount(2);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space to live. Room to become.');
  });
});
