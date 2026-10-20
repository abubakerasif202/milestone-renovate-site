import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes=['/','/bathroom-renovation-cost','/renovation-design-studio','/plan-your-renovation','/concepts/calm-bathroom','/concepts/warm-kitchen','/concepts/connected-living'];
for(const width of [320,390,768,1024,1440,1920]) test(`interactive routes responsive and accessible at ${width}px`,async({page,request})=>{
 test.slow();
 await page.setViewportSize({width,height:900});
 const failures=[];
 for(const route of routes){
  expect((await page.goto(route)).status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  const {violations}=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  failures.push(...violations.map(v=>`${route}: ${v.id} ${v.nodes.map(n=>n.target.join(' ')).join('|')}`));
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}});
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));
  expect(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src))).toEqual([]);
 }
 expect(failures).toEqual([]);
});
test('studio completes, recovers, shares and hands safe preferences to questionnaire',async({page})=>{
 await page.goto('/renovation-design-studio');
 await expect(page.locator('[data-next]')).toBeDisabled();
 await page.locator('[data-choice="bathroom"]').click();
 await page.locator('[data-next]').click();
 await expect(page.locator('[data-step-heading]')).toBeFocused();
 await page.locator('[data-choice="scandinavian"]').click();
 await page.locator('[data-next]').click();
 await page.locator('[data-choice="sage-cream"]').click();
 await page.reload();
 await expect(page.locator('.studio-summary')).toContainText('Sage & cream');
 for(let i=0;i<14 && await page.locator('[data-next]').count();i++){
  if(await page.locator('[data-next]').isDisabled()) await page.locator('[data-choice]').first().click();
  await page.locator('[data-next]').click();
 }
 await expect(page.locator('[data-print]')).toBeVisible();
 await expect(page.locator('[data-share]')).toBeVisible();
 await expect(page.locator('.studio-preview')).toContainText('not completed Milestone work');
 await page.locator('[data-enquire]').click();
 await expect(page).toHaveURL(/plan-your-renovation/);
 await expect(page.locator('.planning-review')).toContainText('Scandinavian');
 const stored=await page.evaluate(()=>JSON.stringify({...sessionStorage}));
 expect(stored).not.toMatch(/email|phone|consent|"name"|details|suburb/i);
});
test('postcode entry validates and prefills without rejecting an unverified suburb',async({page})=>{
 await page.goto('/');
 await page.locator('[data-postcode-entry] button').click();
 await expect(page.locator('#postcode-error')).toBeVisible();
 await page.locator('[data-postcode-entry] input[name="postcode"]').fill('2150');
 await page.locator('[data-postcode-entry] button').click();
 await expect(page).toHaveURL(/plan-your-renovation/);
 await page.locator('input[name="category"][value="bathroom"]').check({force:true});
 await page.locator('[data-next]').click();
 await expect(page.locator('#wizard-step-label')).not.toHaveText('Step 2 of 9');
});
test('new routes have indexable metadata and all local links resolve',async({page,request})=>{
 const checked=new Set();
 for(const route of routes){
  await page.goto(route);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://milestonerenovate.com${route==='/'?'/':route}`);
  const links=await page.locator('a[href],img[src],script[src],link[href]').evaluateAll(els=>els.map(e=>e.getAttribute('href')||e.getAttribute('src')));
  for(const link of links){if(!link?.startsWith('/')||link.startsWith('//'))continue;const path=link.split(/[?#]/)[0];if(!path||checked.has(path))continue;checked.add(path);expect((await request.get(path)).status(),path).toBe(200);}
 }
});
test('calculator handoff replaces an incompatible design even when storage writes fail',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>sessionStorage.setItem('mr-planning-context-v1',JSON.stringify({version:1,studio:{room:'kitchen',style:'warm-minimalism'}})));
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};});
 await page.goto('/plan-your-renovation?category=bathroom&from=calculator&finish=premium');
 await page.locator('[data-back]').click();
 await expect(page.locator('input[name="category"][value="bathroom"]')).toBeChecked();
});
test('bathroom planning links to canonical calculator without pricing other services',async({page})=>{
 await page.goto('/plan-your-renovation?category=bathroom');
 await expect(page.getByRole('link',{name:'Estimate your bathroom renovation →'})).toHaveAttribute('href','/bathroom-renovation-cost');
 await page.goto('/plan-your-renovation?category=extension');
 await expect(page.getByRole('link',{name:'Estimate your bathroom renovation →'})).toBeHidden();
});
test('studio selection and progress work with keyboard alone',async({page})=>{
 await page.goto('/renovation-design-studio');
 await page.locator('[data-choice="bathroom"]').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('[data-choice="bathroom"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-next]').focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-step-heading]')).toBeFocused();
 await page.locator('[data-back]').focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-choice="bathroom"]')).toHaveAttribute('aria-pressed','true');
});
