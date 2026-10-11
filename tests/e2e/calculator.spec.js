import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Local dev server only (in-memory store, no email). Nothing here touches production.
const range = (page) => page.locator('#calc-range');
const card = (page, name, value) => page.locator(`label.calc-card:has(input[name="${name}"][value="${value}"])`);
const toggle = (page, name) => page.locator(`label.calc-toggle:has(input[name="${name}"]:not([disabled]))`);
const nums = (text) => text.split('–').map((s) => Number(s.replace(/[^0-9]/g, '')));

test.describe('renovation cost calculator', () => {
  test('shows an AUD range immediately and updates as options change', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await expect(range(page)).toHaveText('$26,500 – $43,000');
    await expect(page.locator('#calc-result')).toContainText('3-6 weeks');
    await expect(page.locator('#calc-result')).toContainText('include GST');

    await card(page, 'finish', 'premium').click();
    await expect(range(page)).toHaveText('$42,500 – $77,000');
    await toggle(page, 'layoutChange').click();
    await expect(range(page)).toHaveText('$44,500 – $84,000');
    await card(page, 'size', 'small').click();
    await page.waitForTimeout(700); // let the count-up animation settle
    const small = nums(await range(page).textContent());
    await card(page, 'size', 'large').click();
    await page.waitForTimeout(700);
    const large = nums(await range(page).textContent());
    expect(small[1]).toBeLessThan(large[1]);
    expect(await page.locator('#calc-result').textContent()).not.toMatch(/NaN|Infinity|undefined/);
  });

  test('every control is keyboard operable and low never exceeds high', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await page.locator('input[name="finish"][value="essential"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('input[name="finish"][value="essential"]')).toBeChecked();
    await page.locator('input[name="diyDemolition"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('input[name="diyDemolition"]')).toBeChecked();
    const [low, high] = nums(await range(page).textContent());
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThanOrEqual(high);
  });

  test('kitchen switches the controls, explains unpriced scope and excludes appliances', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await card(page, 'project', 'kitchen').click();
    await expect(range(page)).toHaveText('$36,500 – $63,500');
    await expect(page.locator('input[name="size"]').first()).toBeHidden();
    await toggle(page, 'wallRemoval').click();
    await expect(page.locator('#calc-result')).toContainText('not separately priced');
    await expect(range(page)).toHaveText('$36,500 – $63,500');
    await page.locator('#calc-result summary').click();
    await expect(page.locator('#calc-result')).toContainText('Appliances');
    await expect(page.locator('#calc-result')).toContainText('10-14 weeks');
  });

  test('whole-home and extension are quote-only and lead to the questionnaire', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    const link = page.getByRole('link', { name: /Extension/ });
    await expect(link).toHaveAttribute('href', '/plan-your-renovation?category=extension');
    await link.click();
    await expect(page).toHaveURL(/plan-your-renovation/);
    await page.locator('[data-back]').click();
    await expect(page.locator('input[name="category"][value="extension"]')).toBeChecked();
  });

  test('a saved calculator estimate never overrides an explicit service hand-off', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await expect(range(page)).toBeVisible();
    await page.goto('/plan-your-renovation?category=kitchen');
    await page.locator('[data-back]').click();
    await expect(page.locator('input[name="category"][value="kitchen"]')).toBeChecked();
    await expect(page.locator('.planning-review')).toBeHidden();
  });

  test('own supply is not priced as labour-only and says so', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await card(page, 'supply', 'own_supply').click();
    await expect(range(page)).toHaveText('$26,500 – $43,000');
    await expect(page.locator('#calc-result')).toContainText('Labour-only pricing is not estimated');
  });

  test('assumption-based allowances and published figures are labelled', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await toggle(page, 'wallRemoval').click();
    await expect(page.locator('#calc-result .calc-basis-assumption').first()).toHaveText('Planning allowance');
    await expect(page.locator('#calc-result .calc-basis-source').first()).toHaveText('Published figure');
  });

  test('detailed quote hand-off carries the whole selection into the questionnaire and a mocked submission succeeds', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await card(page, 'finish', 'premium').click();
    await card(page, 'access', 'apartment').click();
    await toggle(page, 'layoutChange').click();
    const cta = page.locator('#calc-result').getByRole('link', { name: /detailed quote/ });
    await expect(cta).toHaveAttribute('href', /category=bathroom.*from=calculator.*finish=premium.*estimate=/);
    await cta.click();
    await expect(page).toHaveURL(/plan-your-renovation/);
    await expect(page.locator('.planning-review')).toBeVisible();
    await page.locator('.planning-review summary').click();
    const review = page.locator('.planning-review');
    await expect(review).toContainText('Estimate · Indicative range shown (incl. GST)');
    await expect(review).toContainText('Estimate · Layout change');
    await expect(review).toContainText('Apartment');

    // Local mock only: intercept the API so even the in-memory handler is never called.
    let body;
    await page.route('**/api/enquiries', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, reference: 'MR-MOCK0001' }) });
    });
    await page.fill('#postcode', '2000');
    const next = page.getByRole('button', { name: /Continue/ });
    for (let i = 0; i < 12 && (await next.isVisible()); i += 1) await next.click();
    await page.fill('#name', 'Test Person');
    await page.fill('#phone', '0412345678');
    await page.fill('#email', 'test@example.com');
    await page.check('#consent');
    await page.waitForTimeout(2700);
    await page.getByRole('button', { name: /Send my brief/ }).click();
    await expect(page.locator('#form-success')).toBeVisible();
    expect(body.source).toBe('calculator');
    expect(body.wizard.planning.estimate).toMatchObject({ project: 'bathroom', finish: 'premium', access: 'apartment', layoutChange: true });
    expect(JSON.stringify(body)).not.toMatch(/lowAud|highAud/);
  });

  test('the animated range bar moves with the selection and uses no inline styles', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    const fill = page.locator('.cc-fill');
    await expect(fill).toHaveClass(/cc-lo-\d+/);
    const before = await fill.getAttribute('class');
    await card(page, 'finish', 'premium').click();
    await expect.poll(() => fill.getAttribute('class')).not.toBe(before);
    await expect(page.locator('.cc-scale')).toHaveAttribute('aria-label', /Estimated range \$4\d,\d{3} to \$7\d,\d{3}/);
    await expect(page.locator('.cc-stack .cc-seg')).toHaveCount(6);
    expect(await page.locator('[style]').count()).toBe(0);
    await card(page, 'project', 'kitchen').click();
    await expect(page.locator('.cc-breakdown')).toBeHidden();
  });

  test('reduced motion shows the final range immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/bathroom-renovation-cost');
    await card(page, 'finish', 'premium').click();
    await expect(range(page)).toHaveText('$42,500 – $77,000', { timeout: 300 });
  });

  test('selections survive a reload in the same session', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await card(page, 'finish', 'premium').click();
    await page.reload();
    await expect(page.locator('input[name="finish"][value="premium"]')).toBeChecked();
    await expect(range(page)).toHaveText('$42,500 – $77,000');
  });

  test('methodology and disclaimer links are present and resolve', async ({ page, request }) => {
    await page.goto('/bathroom-renovation-cost');
    await expect(page.locator('#how-it-works')).toContainText('Published figure');
    await expect(page.locator('#how-it-works')).toContainText('Planning allowance');
    for (const href of ['/estimate-disclaimer', '/terms', '/privacy']) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
      expect((await request.get(href)).status()).toBe(200);
    }
  });

  for (const [name, width] of [['mobile', 390], ['small', 320], ['tablet', 768], ['desktop', 1440]]) {
    test(`no horizontal overflow and a visible range at ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/bathroom-renovation-cost');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      await expect(range(page)).toBeVisible();
      if (width <= 1040) await expect(page.locator('.cc-live')).toBeVisible();
    });
  }

  test('has no automatically detectable accessibility violations (both projects)', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    const scan = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    let results = await scan();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 90)}`)).toEqual([]);
    await card(page, 'project', 'kitchen').click();
    results = await scan();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].html.slice(0, 90)}`)).toEqual([]);
  });

  test('console stays clean while using the calculator', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/bathroom-renovation-cost');
    await card(page, 'project', 'kitchen').click();
    await card(page, 'project', 'bathroom').click();
    expect(errors).toEqual([]);
  });
});
