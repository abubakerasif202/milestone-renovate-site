import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 640 }, { width: 768, height: 1024 }]) {
  test(`intro plays and fades at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const intro = page.locator('.opening-intro');
    await expect(intro).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.opening-intro video')?.currentTime > 1);
    expect(await intro.locator('video').evaluate(v => ({ muted: v.muted, rate: v.playbackRate, fit: getComputedStyle(v).objectFit }))).toEqual({ muted: true, rate: 1, fit: 'contain' });
    await page.waitForFunction(() => document.querySelector('.opening-intro video')?.currentTime > 4);
    await page.screenshot({ path: `.tmp/intro-${viewport.width}.png` });
    await expect(intro).toHaveCount(0, { timeout: 10000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.tmp/intro-home-${viewport.width}.png` });
    await page.reload();
    await expect(intro).toHaveCount(0);
    await page.goto('/services');
    await expect(page.locator('script[src*="opening-intro"]')).toHaveCount(0);
    await page.goto('/');
    await expect(intro).toHaveCount(0);
  });
}

test('keyboard skip and Escape release the modal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Skip Intro' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.opening-intro')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('.opening-intro')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.opening-intro')).toHaveCount(0);
});

test('reduced motion never requests video', async ({ page }) => {
  const requests = [];
  page.on('request', r => { if (r.url().includes('/assets/video/')) requests.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.opening-intro')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('failed media immediately releases the page', async ({ page }) => {
  await page.route('**/assets/video/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.opening-intro')).toHaveCount(0);
  await expect(page.locator('h1')).toBeVisible();
});

test('stalled media cannot trap visitors', async ({ page }) => {
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => new Promise(() => {}); });
  await page.goto('/');
  await expect(page.locator('.opening-intro')).toBeVisible();
  await expect(page.locator('.opening-intro')).toHaveCount(0, { timeout: 5000 });
});

test('no JavaScript leaves the homepage accessible', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.opening-intro')).toHaveCount(0);
  await context.close();
});

test('H.264 fallback plays when VP9 is unsupported', async ({ page }) => {
  await page.addInitScript(() => { HTMLMediaElement.prototype.canPlayType = () => ''; });
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('.opening-intro video')?.currentTime > 0.5);
  expect(await page.locator('.opening-intro video').getAttribute('src')).toMatch(/\.mp4$/);
  await page.getByRole('button', { name: 'Skip Intro' }).click();
  await expect(page.locator('.opening-intro')).toHaveCount(0);
});

test('switching to reduced motion releases an active intro', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.opening-intro')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.opening-intro')).toHaveCount(0);
});
