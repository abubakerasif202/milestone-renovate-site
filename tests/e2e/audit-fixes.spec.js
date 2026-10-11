import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const ROUTES = [...readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8').matchAll(/<loc>https:\/\/milestonerenovate\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const WIDTHS = [390, 768, 1024, 1440, 1920];

test.describe('every public route', () => {
  for (const route of ROUTES) {
    test(`${route}: no horizontal overflow at 390/768/1024/1440/1920`, async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${route} @${width}`).toBeLessThanOrEqual(0);
      }
    });

    test(`${route}: axe finds no violations at 390 and 1440`, async ({ page }) => {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), `${route} @${width}`).toEqual([]);
      }
    });
  }
});

test('mobile: standalone footer links and CTAs are at least 44px tall', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const small = await page.$$eval('.footer-links a, .footer-aside a, .footer-brand, .text-link, .call-top', (els) =>
    els.filter((el) => el.offsetParent !== null).map((el) => ({ text: el.textContent.trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height) })).filter((x) => x.h < 44));
  expect(small).toEqual([]);
});

test('mobile nav: opening moves focus into the menu, Tab stays in it, Escape returns focus to the toggle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-menu]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const inNav = () => page.evaluate(() => document.querySelector('#navigation').contains(document.activeElement));
  expect(await inNav()).toBe(true);
  await page.keyboard.press('Tab');
  expect(await inNav()).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('questionnaire keeps answers across a reload but never stores contact details', async ({ page }) => {
  await page.goto('/plan-your-renovation');
  await page.locator('input[name="category"][value="kitchen"]').check({ force: true });
  await page.locator('[data-next]').click();
  await page.locator('input[name="suburb"]').fill('Parramatta');
  await page.locator('input[name="postcode"]').fill('2150');
  await page.reload();
  await expect(page.locator('#wizard-step-label')).toHaveText('Step 2 of 9');
  await expect(page.locator('input[name="suburb"]')).toHaveValue('Parramatta');
  await page.locator('[data-back]').click();
  await expect(page.locator('input[name="category"][value="kitchen"]')).toBeChecked();
  const stored = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
  expect(stored).not.toMatch(/email|phone|consent|"name"/i);
});

test('questionnaire saves a draft as the visitor progresses', async ({ page }) => {
  await page.goto('/plan-your-renovation');
  await page.locator('input[name="category"][value="kitchen"]').check({ force: true });
  await page.locator('[data-next]').click();
  expect(await page.evaluate(() => sessionStorage.getItem('mr-wizard-draft'))).not.toBeNull();
});
