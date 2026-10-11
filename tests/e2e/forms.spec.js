import { test, expect } from '@playwright/test';

// The server rejects submissions completed in under 2.5s (bot timing check), so wait like a human would.
const HUMAN_DELAY = 2700;
const leads = async (request) => (await request.get('/__dev/leads')).json();

async function fillContact(page, over = {}) {
  const v = { name: 'Jordan Citizen', phone: '0412 345 678', email: 'jordan@example.com', suburb: 'Mosman', postcode: '2088', details: 'Replace the bath with a walk-in shower and retile the room.', ...over };
  await page.fill('#name', v.name);
  await page.fill('#phone', v.phone);
  await page.fill('#email', v.email);
  await page.selectOption('#category', 'bathroom');
  await page.fill('#suburb', v.suburb);
  await page.fill('#postcode', v.postcode);
  await page.fill('#details', v.details);
  await page.check('#consent');
}

test.describe('contact form', () => {
  test('shows specific, accessible errors and does not submit invalid data', async ({ page, request }) => {
    const before = (await leads(request)).count;
    await page.goto('/contact');
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    await expect(page.locator('#name-error')).toHaveText('Please enter your full name.');
    await expect(page.locator('#phone-error')).toContainText('valid Australian phone');
    await expect(page.locator('#email-error')).toContainText('valid email');
    await expect(page.locator('#postcode-error')).toContainText('suburb or postcode');
    await expect(page.locator('#consent-error')).toContainText('agree');
    await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#name')).toBeFocused();
    expect((await leads(request)).count).toBe(before);
  });

  test('submits, stores the lead, and only then shows the confirmation reference', async ({ page, request }) => {
    const before = (await leads(request)).count;
    await page.goto('/contact');
    await fillContact(page);
    await page.waitForTimeout(HUMAN_DELAY);
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    const reference = page.locator('#form-success [data-reference]');
    await expect(reference).toHaveText(/^MR-[A-Z2-9]{8}$/);
    await expect(page.locator('#quote-form')).toBeHidden();
    const after = await leads(request);
    expect(after.count).toBe(before + 1);
    expect(after.references).toContain(await reference.textContent());
    expect(after.notified).toContain(await reference.textContent());
  });

  test('a failed submission is reported honestly and a retry creates exactly one lead', async ({ page, request }) => {
    const before = (await leads(request)).count;
    await page.goto('/contact');
    await fillContact(page, { email: 'retry@example.com', details: 'Retry scenario: renovate the ensuite and move the vanity.' });
    await page.waitForTimeout(HUMAN_DELAY);

    await page.route('**/api/enquiries', (route) => route.abort('connectionrefused'));
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    await expect(page.locator('#form-error')).toContainText('not been sent');
    await expect(page.locator('#form-success')).toBeHidden();
    await expect(page.locator('#quote-form')).toBeVisible();

    await page.unroute('**/api/enquiries');
    await page.route('**/api/enquiries', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'storage_unavailable', message: 'We could not save your enquiry just now. Nothing has been sent — please try again.' }) }));
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    await expect(page.locator('#form-error')).toContainText('Nothing has been sent');
    await expect(page.locator('#form-success')).toBeHidden();
    expect((await leads(request)).count).toBe(before);

    await page.unroute('**/api/enquiries');
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    await expect(page.locator('#form-success [data-reference]')).toHaveText(/^MR-/);
    expect((await leads(request)).count).toBe(before + 1);
  });

  test('honeypot field is hidden from users and assistive tech', async ({ page }) => {
    await page.goto('/contact');
    const hp = page.locator('.hp-field');
    await expect(hp).toHaveAttribute('aria-hidden', 'true');
    await expect(hp.locator('input')).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('renovation questionnaire', () => {
  test('progress, validation, contextual options, keyboard use and submission', async ({ page, request }) => {
    const before = (await leads(request)).count;
    await page.goto('/plan-your-renovation');
    const label = page.locator('#wizard-step-label');
    await expect(label).toHaveText('Step 1 of 9');
    await expect(page.locator('#wizard-progress')).toHaveAttribute('value', '1');
    await expect(page.getByRole('button', { name: 'Back' })).toBeHidden();

    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.locator('#category-error')).toContainText('choose what you would like to renovate');
    await expect(label).toHaveText('Step 1 of 9');

    // keyboard selection of a card
    await page.locator('input[name="category"][value="bathroom"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('input[name="category"][value="bathroom"]')).toBeChecked();
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(label).toHaveText('Step 2 of 9');
    await expect(page.locator('legend:focus')).toContainText('Where is the property');

    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.locator('#postcode-error')).toContainText('suburb or postcode');
    await page.fill('#postcode', '0100'); // four digits but below the 0200 Australian minimum
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.locator('#postcode-error')).toContainText('4-digit');
    await page.fill('#postcode', '2088');
    await page.getByRole('button', { name: /Continue/ }).click();

    await page.getByRole('button', { name: /Continue/ }).click(); // property (optional) skipped
    await expect(label).toHaveText('Step 4 of 9');
    await expect(page.getByText('Walk-in shower')).toBeVisible();
    await expect(page.getByText('New cabinetry')).toBeHidden();
    await page.getByText('Walk-in shower').click();

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(label).toHaveText('Step 2 of 9');
    await expect(page.locator('#postcode')).toHaveValue('2088');
    for (let i = 0; i < 2; i += 1) await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.locator('input[name="scope"][value="walk_in_shower"]')).toBeChecked();

    for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: /Continue/ }).click(); // scope, size, finish, budget, notes
    await expect(label).toHaveText('Step 9 of 9');
    await expect(page.getByRole('button', { name: /Continue/ })).toBeHidden();

    await page.getByRole('button', { name: /Send my brief/ }).click();
    await expect(page.locator('#name-error')).toBeVisible();
    await expect(page.locator('#consent-error')).toBeVisible();
    expect((await leads(request)).count).toBe(before);

    await page.fill('#name', 'Sam Wizard');
    await page.fill('#phone', '(02) 9876 5432');
    await page.fill('#email', 'sam.wizard@example.com');
    await page.check('#consent');
    await page.waitForTimeout(HUMAN_DELAY);
    await page.getByRole('button', { name: /Send my brief/ }).click();
    await expect(page.locator('#form-success [data-reference]')).toHaveText(/^MR-[A-Z2-9]{8}$/);
    await expect(page.locator('#wizard')).toBeHidden();
    expect((await leads(request)).count).toBe(before + 1);
  });

  test('changing category swaps the contextual scope options', async ({ page }) => {
    await page.goto('/plan-your-renovation?category=kitchen');
    await expect(page.locator('#wizard-step-label')).toHaveText('Step 2 of 9');
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByText('Extension or addition').click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.fill('#suburb', 'Parramatta');
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByText('Second storey')).toBeVisible();
    await expect(page.getByText('New cabinetry')).toBeHidden();
  });

  test('is usable at 320px with touch-sized controls and no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/plan-your-renovation');
    const card = await page.locator('.choice-body').first().boundingBox();
    expect(card.height).toBeGreaterThanOrEqual(44);
    const next = await page.getByRole('button', { name: /Continue/ }).boundingBox();
    expect(next.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe('bathroom cost planner', () => {
  test('is clearly a planning guide: no dollar figures, updates with choices, hands off to the questionnaire', async ({ page }) => {
    await page.goto('/bathroom-renovation-cost');
    await expect(page.locator('.planning-banner')).toContainText('not a quote');
    const result = page.locator('#calc-result');
    await expect(result.locator('.calc-level')).toBeVisible();
    expect(await result.textContent()).not.toMatch(/\$\s?\d/);
    const first = await result.locator('.calc-level').textContent();

    await page.selectOption('#renovationType', 'full_refit_layout');
    await page.selectOption('#finish', 'premium');
    await page.selectOption('#plumbing', 'major');
    await page.check('input[name="strata"]');
    await expect(result.locator('.calc-level')).not.toHaveText(first);
    await expect(result.locator('.calc-drivers').first()).toContainText('Strata');
    expect(await result.textContent()).not.toMatch(/\$\s?\d/);

    await page.fill('#lengthM', '0');
    await page.getByRole('button', { name: /Update planning guide/ }).click();
    await expect(page.locator('#lengthM-error')).toContainText('between 1 and 10');
    await page.fill('#lengthM', '3');

    const cta = result.getByRole('link', { name: /site assessment/ });
    await expect(cta).toHaveAttribute('href', /category=bathroom.*from=calculator.*finish=premium/);
    await cta.click();
    await expect(page).toHaveURL(/plan-your-renovation/);
    await expect(page.locator('#wizard-step-label')).toHaveText('Step 2 of 9');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('input[name="category"][value="bathroom"]')).toBeChecked();
  });
});
