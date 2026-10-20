// Final optimisation pass: font loading and swap stability, AVIF delivery, phone image-first hero, form/questionnaire/
// calculator transitions (incl. reduced motion), and the corrected business, staff and planning copy.
// Local dev server only (in-memory enquiry store, no email): nothing here touches production.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');
const ROUTES = [...readFileSync(join(PUBLIC, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/milestonerenovate\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const HUMAN_DELAY = 2700; // the server rejects submissions completed in under 2.5s
const delayed = (ms) => async (route) => { await new Promise((resolve) => setTimeout(resolve, ms)); await route.continue(); };

async function fillContact(page) {
  await page.fill('#name', 'Jordan Citizen');
  await page.fill('#phone', '0412 345 678');
  await page.fill('#email', 'jordan@example.com');
  await page.selectOption('#category', 'bathroom');
  await page.fill('#suburb', 'Mosman');
  await page.fill('#postcode', '2088');
  await page.fill('#details', 'Replace the bath with a walk-in shower and retile the room.');
  await page.check('#consent');
}

test.describe('font loading', () => {
  test('all three critical fonts are preloaded from files that exist, on every page', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const hrefs = await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) => links.map((l) => l.getAttribute('href')));
      expect(hrefs, route).toEqual(['/assets/fonts/inter-latin-400-900-normal.woff2', '/assets/fonts/newsreader-latin-400-500-normal.woff2', '/assets/fonts/newsreader-latin-400-500-italic.woff2']);
      for (const href of hrefs) expect(existsSync(join(PUBLIC, href)), href).toBe(true);
    }
  });

  test('no element asks for a weight outside what the trimmed font files contain (no faux bold)', async ({ page }) => {
    const bad = [];
    for (const route of ROUTES) {
      await page.goto(route);
      const found = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
          const weight = Number(cs.fontWeight);
          if (family === 'Newsreader' && (weight < 400 || weight > 500)) out.push(`${el.tagName}.${el.className} Newsreader ${weight}`);
          if (family === 'Inter' && (weight < 400 || weight > 900)) out.push(`${el.tagName}.${el.className} Inter ${weight}`);
        }
        return out;
      });
      bad.push(...found.map((f) => `${route}: ${f}`));
    }
    expect(bad).toEqual([]);
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`a slow font swap does not move the layout at ${width}px (metric-matched fallbacks, font-independent widths)`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 800 ? 800 : 900 });
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.route('**/*.woff2', delayed(1500)); // fonts arrive well after first paint
      await page.goto('/', { waitUntil: 'commit' });
      await page.waitForTimeout(900);
      const before = await page.locator('.hero h1').evaluate((el) => Math.round(el.getBoundingClientRect().height));
      await page.waitForFunction(() => [...document.fonts].filter((f) => f.status === 'loaded').length >= 3, null, { timeout: 8000 });
      await page.waitForTimeout(600);
      const after = await page.locator('.hero h1').evaluate((el) => Math.round(el.getBoundingClientRect().height));
      expect(after, 'headline height before vs after the swap').toBe(before);
      expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
    });
  }
});

test.describe('AVIF delivery', () => {
  test('hero images are offered as AVIF first with a WebP fallback, and Chrome picks the AVIF', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const hero = page.locator('picture:has(img.hero-image)');
    await expect(hero.locator('source')).toHaveAttribute('type', 'image/avif');
    expect(await hero.locator('img').getAttribute('src')).toMatch(/\.webp$/);
    expect(await hero.locator('source').getAttribute('sizes')).toBe(await hero.locator('img').getAttribute('sizes'));
    await expect(hero.locator('img')).toHaveAttribute('fetchpriority', 'high');
    await expect(hero.locator('img')).toHaveAttribute('loading', 'eager');
    expect(await hero.locator('img').evaluate((img) => img.currentSrc)).toMatch(/\.avif$/);
  });

  test('above-the-fold hero images on the inner pages load eagerly with high priority', async ({ page }) => {
    for (const route of ['/services', '/about', '/inspiration', '/kitchen-renovations']) {
      await page.goto(route);
      const img = page.locator('.inner-hero-image img').first();
      await expect(img, route).toHaveAttribute('loading', 'eager');
      await expect(img, route).toHaveAttribute('fetchpriority', 'high');
    }
  });
});

test.describe('phone image-first hero', () => {
  test('on phones the photograph leads, full-bleed; on tablets and desktops the layout is unchanged', async ({ page }) => {
    const box = async (selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; });
    for (const width of [320, 375, 390, 430, 600]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const media = await box('.hero-media');
      const h1 = await box('.hero h1');
      expect(media.top, `${width}px media above headline`).toBeLessThan(h1.top);
      expect(media.left, `${width}px full-bleed left`).toBe(0);
      expect(media.width, `${width}px full-bleed width`).toBe(width);
      await expect(page.locator('.hero-chip')).toContainText('MILESTONE WORK');
    }
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/');
    expect((await box('.hero-media')).top, 'tablet keeps copy first').toBeGreaterThan((await box('.hero h1')).top);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    expect((await box('.hero-media')).left, 'desktop media beside the copy').toBeGreaterThan((await box('.hero h1')).left + 300);
  });

  test('DOM and focus order stay copy-first (only the visual order changes)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const order = await page.evaluate(() => { const c = document.querySelector('.hero-copy'), m = document.querySelector('.hero-media'); return c.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING ? 'copy-first' : 'media-first'; });
    expect(order).toBe('copy-first');
  });

  test('the call bar keeps each label on one line down to 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    for (const label of await page.locator('.mobile-cta-btn span:not(.mobile-cta-icon)').all()) {
      expect((await label.boundingBox()).height).toBeLessThan(24);
    }
  });
});

test.describe('form loading and success transitions', () => {
  test('contact form: a spinner and softened form while sending, then an accessible animated success', async ({ page }) => {
    await page.goto('/contact');
    await fillContact(page);
    await page.waitForTimeout(HUMAN_DELAY);
    await page.route('**/api/enquiries', delayed(900));
    const button = page.locator('[data-submit]');
    await button.click();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveClass(/is-busy/);
    await expect(button).toHaveText(/Sending/);
    await expect(page.locator('#quote-form')).toHaveClass(/is-sending/);
    expect(await button.evaluate((el) => getComputedStyle(el, '::before').animationName)).toBe('m-spin');
    const success = page.locator('#form-success');
    await expect(success).toBeVisible();
    await expect(success.locator('svg.success-mark')).toHaveAttribute('aria-hidden', 'true');
    await expect(success).toBeFocused();
    await expect(success).toHaveClass(/is-entering/);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].target}`)).toEqual([]);
  });

  test('contact form under reduced motion: busy and success are still shown, with no animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/contact');
    await fillContact(page);
    await page.waitForTimeout(HUMAN_DELAY);
    await page.route('**/api/enquiries', delayed(900));
    const button = page.locator('[data-submit]');
    await button.click();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    expect(await button.evaluate((el) => getComputedStyle(el, '::before').animationName)).toBe('none');
    expect(await button.evaluate((el) => getComputedStyle(el, '::before').borderStyle)).toBe('dotted');
    const success = page.locator('#form-success');
    await expect(success).toBeVisible();
    expect(await success.locator('.success-ring').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(success.locator('[data-reference]')).toHaveText(/^MR-/);
    await context.close();
  });

  test('booking form: asks for a call and says so, rather than claiming it is booked', async ({ page }) => {
    await page.goto('/booking');
    await page.fill('#name', 'Jordan Citizen');
    await page.fill('#phone', '0412 345 678');
    await page.fill('#email', 'jordan@example.com');
    await page.fill('#suburb', 'Mosman');
    await page.fill('#postcode', '2088');
    await page.check('#consent');
    await page.waitForTimeout(HUMAN_DELAY);
    await page.getByRole('button', { name: /Request Strategy Call/ }).click();
    const success = page.locator('#booking-success');
    await expect(success).toBeVisible();
    await expect(success).toContainText('CALL REQUESTED');
    await expect(success).toContainText('to confirm a time');
    await expect(success).not.toContainText(/booked|confirmed/i);
    await expect(success.locator('svg.success-mark')).toHaveCount(1);
    await expect(success).toBeFocused();
  });
});

test.describe('questionnaire step transitions', () => {
  async function toStepTwo(page) {
    await page.goto('/plan-your-renovation');
    await page.locator('input[name="category"][value="kitchen"]').check({ force: true });
  }

  test('the incoming step wipes in from the side it is reached from, in both directions', async ({ page }) => {
    await toStepTwo(page);
    await page.locator('[data-next]').click();
    await expect(page.locator('#wizard-step-label')).toHaveText('Step 2 of 9');
    await expect(page.locator('#wizard')).toHaveAttribute('data-step-dir', 'forward');
    await expect(page.locator('.wizard-step.is-entering')).toHaveCount(1);
    expect(await page.locator('.wizard-step.is-entering').evaluate((el) => getComputedStyle(el).animationName)).toBe('m-wipe-fwd');
    await page.waitForTimeout(700);
    await expect(page.locator('.wizard-step.is-entering')).toHaveCount(0);
    await page.locator('[data-back]').click();
    await expect(page.locator('#wizard')).toHaveAttribute('data-step-dir', 'back');
    expect(await page.locator('.wizard-step.is-entering').evaluate((el) => getComputedStyle(el).animationName)).toBe('m-wipe-back');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].target}`)).toEqual([]);
  });

  test('reduced motion: steps change instantly with no transition class', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await toStepTwo(page);
    await page.locator('[data-next]').click();
    await expect(page.locator('#wizard-step-label')).toHaveText('Step 2 of 9');
    await expect(page.locator('.wizard-step.is-entering')).toHaveCount(0);
    await context.close();
  });
});

test('calculator updates immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bathroom-renovation-cost');
  await page.locator('input[name="size"][value="large"]').check();
  await expect(page.locator('[data-price]')).toHaveText('$24,000–$34,000');
});

test.describe('verified business, staff and planning copy', () => {
  const BANNED = [
    [/senior (milestone |construction )?(renovation )?(consultant|estimator)/i, 'unsupported seniority claim'],
    [/20-day/i, 'absolute 20-day approval claim'],
    [/Monday to Friday|8:30\s?am|5:30\s?pm/i, 'unverified business hours'],
    [/Housing SEPP/i, 'wrong planning instrument (the Codes SEPP applies)'],
    [/zero council|bypass council/i, 'overstated approval promise'],
    [/Sydney (construction )?estimators/i, 'unverified estimator claim'],
    [/strategy call is booked|CONSULTATION CONFIRMED/i, 'a request is not a confirmed booking'],
  ];

  test('no page, script or generator carries the removed claims', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const text = await page.locator('html').evaluate((el) => el.innerText + ' ' + el.querySelector('meta[name="description"]').content + ' ' + document.title);
      for (const [pattern, reason] of BANNED) expect(text, `${route}: ${reason}`).not.toMatch(pattern);
    }
    for (const file of ['booking-ui.js', 'quote-audit-ui.js']) {
      const source = readFileSync(join(PUBLIC, 'js', file), 'utf8');
      for (const [pattern, reason] of BANNED) expect(source, `${file}: ${reason}`).not.toMatch(pattern);
    }
  });

  test('the booking page offers the email address instead of unverified opening hours', async ({ page }) => {
    await page.goto('/booking');
    await expect(page.locator('.contact-info')).toContainText('1800 008 883');
    await expect(page.locator('.contact-info a[href="mailto:admin@milestonerenovate.com"]')).toBeVisible();
  });
});
