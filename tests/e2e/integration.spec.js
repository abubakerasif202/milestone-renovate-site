import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Live pipeline check. Creates REAL labelled test leads and sends REAL staff emails.
//   INTEGRATION=1 DEPLOYED_URL=https://… npx playwright test tests/e2e/integration.spec.js
const base = process.env.DEPLOYED_URL;
test.skip(!base || process.env.INTEGRATION !== '1', 'set INTEGRATION=1 and DEPLOYED_URL to run the live pipeline check');
test.use({ baseURL: base });

const LABEL = 'ZZ TEST - integration check (safe to delete)';
const note = (name, reference) => { mkdirSync('test-results', { recursive: true }); writeFileSync(`test-results/ref-${name}.txt`, reference); };

test('desktop contact form: real submission is stored and confirmed with a reference', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/contact');
  await page.fill('#name', LABEL);
  await page.fill('#phone', '0412 345 678');
  await page.fill('#email', 'integration-test@example.com');
  await page.selectOption('#category', 'bathroom');
  await page.fill('#suburb', 'Test Suburb');
  await page.fill('#postcode', '2000');
  await page.fill('#details', 'AUTOMATED TEST ENQUIRY from the deployment integration check. Please ignore and delete.');
  await page.check('#consent');
  await page.waitForTimeout(2800);
  await page.getByRole('button', { name: /Send enquiry/ }).click();
  const ref = page.locator('#form-success [data-reference]');
  await expect(ref).toHaveText(/^MR-[A-Z2-9]{8}$/, { timeout: 15000 });
  note('contact-desktop', await ref.textContent());
});

test('mobile questionnaire: real submission is stored and confirmed with a reference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan-your-renovation?category=kitchen');
  await page.fill('#postcode', '2000');
  await page.fill('#suburb', 'Test Suburb');
  await page.getByRole('button', { name: /Continue/ }).click();
  for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: /Continue/ }).click(); // property, scope, size, finish, budget -> notes
  await page.fill('#details', 'AUTOMATED TEST ENQUIRY (questionnaire, mobile). Please ignore and delete.');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.fill('#name', LABEL);
  await page.fill('#phone', '(02) 9876 5432');
  await page.fill('#email', 'integration-test@example.com');
  await page.check('#consent');
  await page.waitForTimeout(2800);
  await page.getByRole('button', { name: /Send my brief/ }).click();
  const ref = page.locator('#form-success [data-reference]');
  await expect(ref).toHaveText(/^MR-[A-Z2-9]{8}$/, { timeout: 15000 });
  note('wizard-mobile', await ref.textContent());
});

test('mobile contact form: validation errors are shown and nothing is sent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let posts = 0;
  page.on('request', (r) => { if (r.url().endsWith('/api/enquiries') && r.method() === 'POST') posts += 1; });
  await page.goto('/contact');
  await page.getByRole('button', { name: /Send enquiry/ }).click();
  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#consent-error')).toBeVisible();
  await expect(page.locator('#form-success')).toBeHidden();
  expect(posts).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('server-side validation rejects a crafted bad payload with field errors (no row created)', async ({ request }) => {
  const res = await request.post('/api/enquiries', { data: { idempotencyKey: crypto.randomUUID(), name: 'x', phone: '1', email: 'bad', category: 'nope', source: 'contact-form', consent: false } });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(Object.keys(body.fields)).toEqual(expect.arrayContaining(['name', 'phone', 'email', 'category', 'consent']));
});
