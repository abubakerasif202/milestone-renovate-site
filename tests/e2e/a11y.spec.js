import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/services', '/about', '/inspiration', '/contact', '/privacy', '/plan-your-renovation', '/bathroom-renovation-cost', '/kitchen-renovations', '/bathroom-renovations', '/home-renovations', '/extensions', '/no-such-page'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const width of [1440, 390]) {
  test(`axe: no WCAG 2.2 AA violations at ${width}px`, async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    const failures = [];
    for (const path of PAGES) {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of violations) failures.push(`${path}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    expect(failures).toEqual([]);
  });
}

test('axe: questionnaire steps, error states and open mobile menu', async ({ page }) => {
  test.slow();
  const failures = [];
  const scan = async (label) => {
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    for (const v of violations) failures.push(`${label}: ${v.id} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  };
  await page.goto('/plan-your-renovation');
  await page.getByRole('button', { name: /Continue/ }).click(); // category error state
  await scan('wizard step 1 error');
  await page.getByText('Bathroom', { exact: true }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await scan('wizard step 2');
  await page.fill('#postcode', '2088');
  for (let step = 3; step <= 9; step += 1) {
    await page.getByRole('button', { name: /Continue/ }).click();
    await scan(`wizard step ${step}`);
  }
  await page.goto('/contact');
  await page.getByRole('button', { name: /Send enquiry/ }).click();
  await scan('contact errors');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await scan('mobile menu open');
  expect(failures).toEqual([]);
});
