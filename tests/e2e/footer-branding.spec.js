import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [375, 768, 1440]) {
  test(`footer branding at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const footer = page.locator('footer');
    const credit = footer.locator('.developer-credit');
    await credit.scrollIntoViewIfNeeded();
    await expect(credit).toHaveCount(1);
    await expect(credit).toHaveAttribute('href', 'https://abwebstudio.com.au/');
    await expect(credit).toHaveAttribute('target', '_blank');
    await expect(credit).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(credit).toHaveText('Website Designed & Developed by AB Web Studio');
    const logo = credit.locator('img');
    await expect(logo).toHaveJSProperty('complete', true);
    await expect(logo).toHaveJSProperty('naturalWidth', 448);
    const box = await logo.boundingBox();
    expect(box.width / box.height).toBeCloseTo(448 / 206, 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const before = await credit.boundingBox();
    await page.evaluate(() => document.fonts.ready);
    expect(await credit.boundingBox()).toEqual(before);
    const { violations } = await new AxeBuilder({ page }).include('footer').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations).toEqual([]);
    for (const link of await footer.locator('a').all()) {
      const href = await link.getAttribute('href');
      if (href.startsWith('/')) expect((await page.request.get(href)).status(), href).toBe(200);
    }
    await page.screenshot({ path: `test-results/footer-context-${width}.png` });
    await page.locator('.footer-bar').screenshot({ path: `test-results/footer-${width}.png` });
    await context.route('https://abwebstudio.com.au/', route => route.fulfill({ body: '<title>AB Web Studio</title>' }));
    const popupPromise = context.waitForEvent('page');
    await logo.click();
    const popup = await popupPromise;
    await popup.waitForURL('https://abwebstudio.com.au/');
    await popup.close();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await credit.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(await logo.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  });
}
