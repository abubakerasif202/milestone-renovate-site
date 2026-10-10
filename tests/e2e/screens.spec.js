import { test } from '@playwright/test';

// Visual review artefacts (written to test-results/, which is git-ignored). Not assertions.
const shots = [
  ['home-1440', 1440, 900, '/', null],
  ['home-768', 768, 1024, '/', null],
  ['home-390', 390, 844, '/', null],
  ['menu-390', 390, 844, '/', async (page) => { await page.getByRole('button', { name: 'Open navigation' }).click(); }],
  ['home-320', 320, 640, '/', null],
  ['wizard-390', 390, 844, '/plan-your-renovation', null],
  ['wizard-scope-1440', 1440, 900, '/plan-your-renovation?category=bathroom', async (page) => { await page.fill('#postcode', '2088'); await page.getByRole('button', { name: /Continue/ }).click(); await page.getByRole('button', { name: /Continue/ }).click(); }],
  ['calc-1440', 1440, 900, '/bathroom-renovation-cost', null],
  ['contact-390', 390, 844, '/contact', null],
];

for (const [name, width, height, path, action] of shots) {
  test(`screenshot ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(path);
    if (action) await action(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/shot-${name}.png` });
  });
}
