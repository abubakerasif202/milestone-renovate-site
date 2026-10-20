import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LEGAL = ['/privacy', '/terms', '/estimate-disclaimer'];

test.describe('team section', () => {
  test('renders all three portraits at 4:5 with equal card heights and no stretching', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/about');
    const section = page.locator('#team');
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { level: 2 })).toContainText('A hands-on team');
    const cards = section.locator('.team-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('h3')).toHaveText(['James Creswick', 'Kamala Najafi', 'Muhammad Mohsini']);
    const expectedPortraits = [
      ['/assets/img/team/james-creswick-800.webp', 'James Creswick, smiling with light-brown hair in a green Milestone Development shirt'],
      ['/assets/img/team/kamala-najafi-800.webp', 'Kamala Najafi, dark-haired and bearded in a green Milestone Renovate shirt'],
      ['/assets/img/team/muhammad-mohsini-800.webp', 'Muhammad Mohsini, clean-shaven with dark hair in a green Milestone Renovate shirt'],
    ];
    const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    expect(Math.abs(boxes[0].height - boxes[1].height)).toBeLessThan(1);
    expect(Math.abs(boxes[1].height - boxes[2].height)).toBeLessThan(1);
    const photoHeights = await cards.locator('.team-photo img').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(Math.max(...photoHeights) - Math.min(...photoHeights)).toBeLessThan(1);
    const imgs = section.locator('img');
    for (let i = 0; i < 3; i += 1) {
      const img = imgs.nth(i);
      await expect(img).toHaveAttribute('src', expectedPortraits[i][0]);
      await expect(img).toHaveAttribute('alt', expectedPortraits[i][1]);
      await expect.poll(() => img.evaluate((e) => e.complete && e.naturalWidth > 0)).toBe(true);
      const r = await img.evaluate((e) => { const b = e.getBoundingClientRect(); return { ratio: b.width / b.height, natural: e.naturalWidth / e.naturalHeight, fit: getComputedStyle(e).objectFit }; });
      expect(r.ratio).toBeCloseTo(0.8, 2);
      expect(r.natural).toBeCloseTo(1122 / 1402, 2);
      expect(r.fit).toBe('cover');
    }
    await expect(section.locator('.team-role, .team-body p')).toHaveCount(0);
  });

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    test(`team layout has no overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/about');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      const cols = await page.locator('.team-grid').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      expect(cols).toBe(width <= 760 ? 1 : width <= 1020 ? 2 : 3);
      if (width > 760 && width <= 1020) {
        // two columns: the third card sits centred on its own row
        const boxes = await page.locator('.team-card').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
        const grid = await page.locator('.team-grid').evaluate((e) => { const b = e.getBoundingClientRect(); return b.left + b.width / 2; });
        expect(boxes[2].top).toBeGreaterThan(boxes[0].bottom - 1);
        expect(Math.abs(boxes[2].left + boxes[2].width / 2 - grid)).toBeLessThan(2);
      }
    });
  }

  test('team anchor works from the about hero and the footer link points at it', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: /Meet the team/ }).first().click();
    await expect(page).toHaveURL(/about#team$/);
    await expect(page.locator('#team')).toBeInViewport();
    await page.goto('/contact');
    await page.locator('footer a[href="/about#team"]').click();
    await expect(page).toHaveURL(/about#team$/);
  });

  test('about page has no accessibility violations and loads the portraits under the CSP', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/about');
    await page.locator('#team').scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 90)}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('legal pages and contact email', () => {
  for (const path of LEGAL) {
    test(`${path} is complete, accessible and free of draft language`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      const text = await page.locator('main').innerText();
      expect(text.length).toBeGreaterThan(1500);
      expect(text).not.toMatch(/working draft|legal review|before public launch|TODO|lorem/i);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 90)}`)).toEqual([]);
    });
  }

  test('every mailto link on key pages is admin@milestonerenovate.com', async ({ page }) => {
    for (const path of ['/', '/contact', '/about', '/privacy', '/terms', '/estimate-disclaimer', '/booking', '/quote-audit']) {
      await page.goto(path);
      const hrefs = await page.locator('a[href^="mailto:"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs.length, path).toBeGreaterThan(0);
      for (const href of hrefs) expect(href, path).toBe('mailto:admin@milestonerenovate.com');
    }
  });

  test('the legal links in the footer navigate to the right pages', async ({ page }) => {
    await page.goto('/');
    for (const [name, url] of [['Privacy Policy', '/privacy'], ['Terms of Use', '/terms'], ['Estimate Disclaimer', '/estimate-disclaimer']]) {
      await page.goto('/');
      await page.locator('footer').getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${url}$`));
    }
  });

  test('the enquiry consent wording references the privacy policy and is not bundled with marketing', async ({ page }) => {
    await page.goto('/contact');
    const consent = await page.locator('label.consent').innerText();
    expect(consent).toMatch(/contacting me about my enquiry/);
    expect(consent).not.toMatch(/marketing|newsletter|promotions/i);
    await expect(page.locator('label.consent a[href="/privacy"]')).toBeVisible();
  });
});
