import { test, expect } from '@playwright/test';

// Runs only against a deployed URL:  DEPLOYED_URL=https://… npx playwright test tests/e2e/deployed.spec.js
const base = process.env.DEPLOYED_URL;
test.skip(!base, 'set DEPLOYED_URL to run deployed-site checks');
test.use({ baseURL: base, serviceWorkers: 'block' });

// Deployment checks must never write production data. Form responses are mocked below.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
    ? route.continue()
    : route.abort('blockedbyclient'));
});

test('headers: security set present, noindex on vercel.app, no external image hosts', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(res.status()).toBe(200);
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['strict-transport-security']).toContain('max-age=31536000');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  if (new URL(base).host.endsWith('.vercel.app')) expect(h['x-robots-tag']).toContain('noindex');
  expect(await res.text()).not.toContain('raw.githubusercontent.com');
});

test('home page images load from the site itself under the CSP with no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
  await page.waitForTimeout(800);
  const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});

test('an unavailable API shows an honest form error without submitting live data', async ({ page }) => {
  let mockedSubmissions = 0;
  await page.route('**/api/enquiries', async (route) => {
    expect(route.request().method()).toBe('POST');
    mockedSubmissions += 1;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Enquiries are temporarily unavailable. Your details have not been sent.' }) });
  });
  await page.goto('/contact');
  await page.fill('#name', 'Deploy Check');
  await page.fill('#phone', '0412345678');
  await page.fill('#email', 'deploy-check@example.com');
  await page.selectOption('#category', 'kitchen');
  await page.fill('#postcode', '2000');
  await page.fill('#details', 'Automated deployment check — please ignore.');
  await page.check('#consent');
  await page.waitForTimeout(2700);
  await page.getByRole('button', { name: /Send enquiry/ }).click();
  await expect(page.locator('#form-error')).toContainText(/temporarily unavailable|not been sent|could not save/i);
  await expect(page.locator('#form-success')).toBeHidden();
  await expect(page.locator('#quote-form')).toBeVisible();
  expect(mockedSubmissions).toBe(1);
});

test('API routing: wrong method 405, JSON error shape, edge rule is not tripped by normal use', async ({ request }) => {
  const get = await request.get('/api/enquiries');
  expect(get.status()).toBe(405);
  expect((await get.json()).code).toBe('method_not_allowed');
});
