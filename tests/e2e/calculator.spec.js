import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const radio = (page, name, value) => page.locator(`input[name="${name}"][value="${value}"]`).check();
async function contacts(page) {
  await page.locator('[name=name]').fill('Test Person'); await page.locator('[name=email]').fill('test@example.com');
  await page.locator('[name=postcode]').fill('2000'); await page.locator('[name=consent]').check();
}
test('exact live totals, conditional lift reset, full scope and reset', async ({ page }) => {
  await page.goto('/bathroom-renovation-cost');
  await expect(page.locator('[data-price]')).toHaveText('$20,000–$30,000');
  await radio(page, 'property', 'apartment'); await radio(page, 'lift', 'no');
  await expect(page.locator('[data-price]')).toHaveText('$22,000–$32,000');
  await radio(page, 'property', 'ground'); await expect(page.locator('[data-lift]')).toBeHidden();
  await expect(page.locator('[data-price]')).toHaveText('$20,000–$30,000');
  await radio(page, 'size', 'large'); await radio(page, 'subfloor', 'concrete');
  await radio(page, 'property', 'apartment'); await radio(page, 'lift', 'no'); await radio(page, 'package', 'all_inclusive');
  for (const name of ['removeWalls', 'changeLayout', 'recessedNiche']) await page.locator(`[name=${name}]`).check();
  await expect(page.locator('[data-price]')).toHaveText('$36,600–$46,600');
  await expect(page.locator('[data-weeks]')).toHaveText('5.5–6.5 weeks');
  for (const name of ['diyDemo', 'diyPaint']) await page.locator(`[name=${name}]`).check();
  await expect(page.locator('[data-price]')).toHaveText('$33,100–$43,100');
  await expect(page.locator('[data-weeks]')).toHaveText('5–6 weeks');
  await page.getByRole('button', { name: 'Reset estimate' }).click();
  await expect(page.locator('[data-price]')).toHaveText('$20,000–$30,000');
  await expect(page.locator('[data-weeks]')).toHaveText('2–3 weeks');
});
test('postcode validation, real payload, honest provider error, safe retry and contact fallback', async ({ page }) => {
  let submitted; let calls = 0;
  await page.route('**/api/enquiries', async route => { submitted = route.request().postDataJSON(); calls++; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Email unavailable. Please use contact.' }) }); });
  await page.goto('/bathroom-renovation-cost'); await contacts(page);
  await page.locator('[name=postcode]').fill('abcd'); await page.locator('[data-send]').click();
  await expect(page.locator('[data-errors]')).toContainText('four-digit'); expect(calls).toBe(0);
  await page.locator('[name=postcode]').fill('2150'); await radio(page, 'size', 'medium');
  await page.locator('[data-send]').click();
  await expect(page.locator('[data-submit-status]')).toHaveText('Email unavailable. Please use contact.');
  expect(submitted).toMatchObject({ enquiryType: 'bathroom_renovation_calculator', sourcePage: '/bathroom-renovation-cost', costMin: 22000, costMax: 32000, weeksMin: 2.5, weeksMax: 3.5, postcode: '2150', options: { size: 'medium' } });
  const key = submitted.idempotencyKey; await page.locator('[data-send]').click();
  await expect.poll(() => calls).toBe(2); expect(submitted.idempotencyKey).toBe(key);
  await page.locator('[data-contact-fallback]').click();
  await expect(page.locator('[name=details]')).toHaveValue(/\$22,000–\$32,000/);
  await expect(page.locator('[name=category]')).toHaveValue('bathroom');
});
test('provider acceptance is labelled accurately and does not imply inbox delivery', async ({ page }) => {
  await page.route('**/api/enquiries', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, reference: 'MR-TEST', status: 'email_accepted' }) }));
  await page.goto('/bathroom-renovation-cost'); await contacts(page); await page.locator('[data-send]').click();
  await expect(page.locator('[data-submit-status]')).toContainText('Inbox delivery is not confirmed');
  await expect(page.locator('[data-send]')).toBeDisabled();
});
for (const width of [320, 375, 768, 1440]) test(`responsive controls and accessibility at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/bathroom-renovation-cost');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await radio(page, 'property', 'apartment'); await radio(page, 'lift', 'no');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.locator('[name=diyPaint]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('[name=diyPaint]')).toBeChecked();
});
test('canonical navigation, one calculator, kitchen preservation and no deceptive claims', async ({ page }) => {
  await page.goto('/bathroom-renovations'); await page.getByRole('link', { name: 'Bathroom Cost Planner' }).click();
  await expect(page).toHaveURL(/bathroom-renovation-cost$/);
  await expect(page.locator('[data-bathroom-calculator]')).toHaveCount(1);
  await expect(page.locator('[data-calculator]')).toHaveCount(0);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://milestonerenovate.com/bathroom-renovation-cost');
  expect(await page.locator('body').innerText()).not.toMatch(/surveyed|real-time builders|Find Local Builders|Dream Renovations/i);
  await page.goto('/kitchen-renovation-cost'); await expect(page.locator('[data-kitchen-result]')).toContainText('$36,500 – $63,500');
  await radio(page, 'finish', 'premium'); await expect(page.locator('[data-kitchen-result]')).toContainText('$63,000 – $111,000');
  await page.getByRole('link', { name: 'Request a detailed quote', exact: true }).click();
  await expect(page.locator('.planning-review')).toContainText('Kitchen');
});

test('without JavaScript, quote submission stays disabled and a real contact link remains', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/bathroom-renovation-cost');
  await expect(page.locator('[data-send]')).toBeDisabled();
  await expect(page.locator('[data-price]')).toHaveText('$20,000–$30,000');
  await expect(page.getByRole('link', { name: 'Contact Milestone Renovate', exact: true })).toHaveAttribute('href', '/contact');
  await context.close();
});
