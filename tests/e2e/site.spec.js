import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');
const PAGES = ['/', '/services', '/about', '/inspiration', '/contact', '/privacy', '/terms', '/estimate-disclaimer', '/plan-your-renovation', '/bathroom-renovation-cost', '/kitchen-renovations', '/bathroom-renovations', '/home-renovations'];
const SITE = 'https://milestonerenovate.com';
const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'mobile', width: 390, height: 844 }, { name: 'small', width: 320, height: 640 }];

test.describe('routes, metadata and assets', () => {
  for (const path of PAGES) {
    test(`page ${path} renders with correct SEO metadata`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/raw\.githubusercontent|Failed to load resource/.test(m.text())) errors.push(m.text()); });
      const response = await page.goto(path);
      expect(response.status()).toBe(200);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(15);
      expect(title.length).toBeLessThanOrEqual(75);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc.length).toBeGreaterThanOrEqual(60);
      expect(desc.length).toBeLessThanOrEqual(200);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(SITE + (path === '/' ? '/' : path));
      expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(`${SITE}/assets/brand/og-image.png`);
      expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBe(title);
      await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-AU');
      const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
      expect(ld['@context']).toBe('https://schema.org');
      expect(errors).toEqual([]);
    });
  }

  test('every local asset, stylesheet, script and internal link resolves (no broken paths)', async ({ page, request }) => {
    const checked = new Set();
    const broken = [];
    for (const path of PAGES) {
      await page.goto(path);
      const urls = await page.evaluate(() => [
        ...document.querySelectorAll('img[src], link[href], script[src], a[href]'),
      ].map((el) => el.getAttribute('src') ?? el.getAttribute('href')));
      for (const url of urls) {
        if (!url || !url.startsWith('/') || url.startsWith('//')) continue;
        const clean = url.split('#')[0].split('?')[0];
        if (!clean || checked.has(clean)) continue;
        checked.add(clean);
        const res = await request.get(clean);
        if (res.status() !== 200) broken.push(`${clean} -> ${res.status()} (on ${path})`);
      }
    }
    expect(broken).toEqual([]);
    expect(checked.size).toBeGreaterThan(20);
  });

  test('sitemap lists every page, robots points at it, unknown routes 404 with noindex', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const path of PAGES) expect(sitemap).toContain(`<loc>${SITE}${path === '/' ? '/' : path}</loc>`);
    expect(await (await request.get('/robots.txt')).text()).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    const res = await page.goto('/no-such-page');
    expect(res.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  test('brand logo is present in header and footer and favicons are referenced', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header .brand img');
    await expect(header).toHaveAttribute('src', '/assets/brand/logo-gold.svg');
    await expect(page.locator('footer .footer-brand img')).toHaveAttribute('src', '/assets/brand/logo-gold.svg');
    expect(await header.evaluate((img) => img.naturalWidth)).toBeGreaterThan(100);
    await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveCount(1);
    for (const f of ['favicon-32.png', 'icon-192.png', 'apple-touch-icon.png', 'og-image.png', 'logo-gold.svg']) expect(existsSync(join(PUBLIC, 'assets', 'brand', f))).toBe(true);
  });

  test('home page carries the approved proposition and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Space to live. Room to become.');
    await expect(page.getByText('Explore thoughtful kitchen, bathroom and whole-home renovations, with practical guidance from the first idea to the next conversation.')).toBeVisible();
    await expect(page.locator('.hero form')).toHaveAttribute('action', '/plan-your-renovation');
    await expect(page.locator('.hero').getByRole('link', { name: /Design Studio/ })).toHaveAttribute('href', '/renovation-design-studio');
    await expect(page.locator('.hero-phone a')).toHaveAttribute('href', 'tel:1800008883');
  });

  test('about page shows the three team members in order', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('#team .team-card h3')).toHaveText(['James Creswick', 'Kamal Najafi', 'Mohammad Mohsini']);
  });

  test('no inline scripts or handlers (CSP-safe) and the CSP header is configured', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      expect(await page.locator('script:not([src]):not([type="application/ld+json"])').count()).toBe(0);
      expect(await page.locator('[onclick],[onerror],[onload],[style]').count()).toBe(0);
    }
    const vercel = JSON.parse(readFileSync(join(PUBLIC, '..', 'vercel.json'), 'utf8'));
    const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(vercel.outputDirectory).toBe('public');
  });
});

test.describe('navigation', () => {
  test('desktop navigation links route correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    for (const [name, url] of [['Services', '/services'], ['Our Approach', '/about'], ['Inspiration', '/inspiration'], ['Cost Planner', '/bathroom-renovation-cost'], ['Contact', '/contact']]) {
      await page.locator('#navigation').getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.locator('#navigation a[aria-current="page"]')).toHaveText(name);
    }
  });

  test('mobile menu opens, exposes the primary CTA, closes on Escape and on navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Open navigation' });
    await expect(page.locator('#navigation')).toBeHidden();
    await toggle.click();
    await expect(page.locator('#navigation')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav-cta')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#navigation')).toBeHidden();
    await toggle.click();
    await page.locator('#navigation').getByRole('link', { name: 'Services', exact: true }).click();
    await expect(page).toHaveURL('/services');
    await expect(page.locator('#navigation')).toBeHidden();
  });
});

test.describe('responsive layout', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}px): no horizontal scroll, logo readable, controls reachable`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of ['/', '/contact', '/plan-your-renovation', '/bathroom-renovation-cost', '/services']) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} overflows at ${vp.width}px`).toBeLessThanOrEqual(0);
        const logo = await page.locator('header .brand img').boundingBox();
        expect(logo.width).toBeGreaterThanOrEqual(150);
        expect(logo.x).toBeGreaterThanOrEqual(0);
        if (vp.width <= 870) {
          const toggle = await page.locator('.menu-toggle').boundingBox();
          expect(toggle.x + toggle.width).toBeLessThanOrEqual(vp.width);
          expect(toggle.width).toBeGreaterThanOrEqual(40);
        }
      }
      await page.goto('/');
      await page.screenshot({ path: `test-results/home-${vp.name}.png`, fullPage: true });
    });
  }
});
