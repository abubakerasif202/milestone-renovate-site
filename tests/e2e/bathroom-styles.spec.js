import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';

const manifest=JSON.parse(readFileSync(new URL('../../assets/bathroom-styles.json',import.meta.url)));
const ORDER=['contemporary-australian','industrial','mediterranean','modern-luxury','timeless-classic','scandinavian'];
const COLUMNS={390:1,768:2,1440:3};

async function openStyleStep(page,room='bathroom'){
 await page.goto('/renovation-design-studio');
 await page.locator(`[data-choice="${room}"]`).click();
 await page.locator('[data-next]').click();
}
const loadAll=(page)=>page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));

// Licensed JPEG masters are committed alongside the licence records for reproducible builds.
// The committed variants are validated unconditionally; the masters are checked only where present.
const fullWidth=image=>`public${image.variants.find(v=>v.width===image.width).src}`;
test('six style WebP variants are real, readable and not upscaled',async()=>{
 expect(manifest.images.map(i=>i.style)).toEqual(ORDER);
 for(const image of manifest.images){
  expect(image.alt).toMatch(/Bathroom/);
  expect(image.variants.map(v=>v.width)).toEqual([480,768,image.width]);
  for(const variant of image.variants){
   const meta=await sharp(`public${variant.src}`).metadata();
   expect(meta.format).toBe('webp');expect(meta.width).toBe(variant.width);expect(meta.height).toBe(variant.height);expect(variant.width).toBeLessThanOrEqual(image.width);
  }
 }
});

test('licensed photographic style masters match the manifest',async()=>{
 for(const image of manifest.images){const master=await sharp(image.source).metadata();expect(master.width,image.style).toBeGreaterThanOrEqual(image.width);expect(Math.abs(master.width/master.height-image.width/image.height)).toBeLessThan(0.01);}
});

test('the six photographs are genuinely different rooms, not recoloured copies',async()=>{
 // Compared on the committed full-width variant, which is what visitors actually see.
 const thumbs=await Promise.all(manifest.images.map(async image=>sharp(fullWidth(image)).resize(24,30,{fit:'fill'}).greyscale().normalise().raw().toBuffer()));
 for(let a=0;a<thumbs.length;a++)for(let b=a+1;b<thumbs.length;b++){
  let diff=0;for(let i=0;i<thumbs[a].length;i++)diff+=Math.abs(thumbs[a][i]-thumbs[b][i]);
  expect(diff/thumbs[a].length,`${ORDER[a]} vs ${ORDER[b]}`).toBeGreaterThan(20);
 }
});

for(const width of [390,768,1440])test(`style selector grid, images, selection and moodboard at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const imageRequests=[];page.on('request',r=>{if(r.resourceType()==='image')imageRequests.push(r.url());});
 await openStyleStep(page);
 await expect(page.locator('.studio-step-label')).toContainText('02 / 14');
 await expect(page.locator('progress.studio-progress')).toHaveAttribute('value','2');
 const cards=page.locator('.style-card');
 await expect(cards).toHaveCount(6);
 expect(await page.locator('.style-card').evaluateAll(c=>c.map(x=>x.dataset.choice))).toEqual(ORDER);
 expect(await page.locator('[data-style-grid]').evaluate(g=>getComputedStyle(g).gridTemplateColumns.split(' ').length)).toBe(COLUMNS[width]);
 await loadAll(page);
 const imgs=await page.locator('.style-card img').evaluateAll(list=>list.map(i=>({ok:i.complete&&i.naturalWidth>0,w:i.getAttribute('width'),h:i.getAttribute('height'),srcset:i.srcset,sizes:i.sizes,ratio:(i.getBoundingClientRect().width/i.getBoundingClientRect().height)})));
 for(const [index,img] of imgs.entries()){
  expect(img.ok,ORDER[index]).toBe(true);expect(img.w).toBe(String(manifest.images[index].width));expect(img.h).toBe(String(manifest.images[index].height));expect(img.srcset).toContain('480w');expect(img.srcset).toContain('768w');expect(img.sizes).not.toBe('');
 }
 for(const card of await cards.all()){
  await expect(card).toContainText('Renovation inspiration');
  await expect(card).toHaveAttribute('aria-pressed','false');
  const name=await card.getAttribute('aria-label');expect(name).toMatch(/\w/);
  const box=await card.boundingBox();expect(box.width).toBeGreaterThan(130);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await expect(page.locator('[data-next]')).toBeDisabled();
 await page.locator('[data-choice="industrial"]').click();
 await expect(page.locator('[data-choice="industrial"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.style-card[aria-pressed="true"]')).toHaveCount(1);
 await expect(page.locator('[data-choice="industrial"]')).toBeFocused();
 await expect(page.locator('[data-next]')).toBeEnabled();
 await expect(page.locator('.style-selection-note')).toContainText('Industrial');
 await expect(page.locator('.studio-style-image')).toHaveAttribute('src',/bathroom-style-industrial/);
 await expect(page.locator('.studio-preview figcaption')).toContainText(/Renovation inspiration.*Industrial.*not completed Milestone work/);
 await expect(page.locator('.studio-preview')).toContainText('Industrial');
 // The choice survives a reload and can be changed; the moodboard follows.
 await page.reload();
 await expect(page.locator('.studio-summary')).toContainText('Industrial');
 await page.locator('[data-back]').click();
 await expect(page.locator('[data-choice="industrial"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-choice="mediterranean"]').click();
 await expect(page.locator('.studio-style-image')).toHaveAttribute('src',/bathroom-style-mediterranean/);
 await expect(page.locator('.studio-summary')).toContainText('Mediterranean');
 await expect(page.locator('.studio-summary')).not.toContainText('Industrial');
 await loadAll(page);
 expect(await page.locator('.studio-style-image').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 expect(imageRequests.filter(u=>/\.png(?:$|\?)|incoming-images|ChatGPT/i.test(u)&&!u.includes('/brand/'))).toEqual([]);
 const {violations}=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 expect(violations.map(v=>`${v.id}: ${v.nodes.map(n=>n.target.join(' ')).join('|')}`)).toEqual([]);
});

test('keyboard navigation moves through cards and selects with Enter and Space',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await openStyleStep(page);
 const focused=()=>page.evaluate(()=>document.activeElement?.dataset?.choice);
 await page.locator('.style-card').first().focus();
 expect(await focused()).toBe('contemporary-australian');
 await page.keyboard.press('ArrowRight');expect(await focused()).toBe('industrial');
 await page.keyboard.press('ArrowDown');expect(await focused()).toBe('timeless-classic');
 await page.keyboard.press('ArrowLeft');expect(await focused()).toBe('modern-luxury');
 await page.keyboard.press('ArrowUp');expect(await focused()).toBe('contemporary-australian');
 await page.keyboard.press('ArrowUp');expect(await focused()).toBe('contemporary-australian');
 await page.keyboard.press('End');expect(await focused()).toBe('scandinavian');
 await page.keyboard.press('Home');expect(await focused()).toBe('contemporary-australian');
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Enter');
 await expect(page.locator('[data-choice="industrial"]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Space');
 await expect(page.locator('[data-choice="mediterranean"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.style-card[aria-pressed="true"]')).toHaveCount(1);
 await page.locator('[data-next]').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('[data-step-heading]')).toBeFocused();
 await expect(page.locator('.studio-step-label')).toContainText('03 / 14');
});

test('selected style carries into the questionnaire without personal data',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await openStyleStep(page);
 await page.locator('[data-choice="timeless-classic"]').click();
 await page.locator('[data-next]').click();
 for(let i=0;i<14 && await page.locator('[data-next]').count();i++){
  if(await page.locator('[data-next]').isDisabled()) await page.locator('[data-choice]').first().click();
  await page.locator('[data-next]').click();
 }
 await expect(page.locator('.studio-summary')).toContainText('Timeless classic');
 await page.locator('[data-enquire]').click();
 await expect(page).toHaveURL(/plan-your-renovation/);
 await expect(page.locator('.planning-review')).toContainText('Timeless classic');
 const stored=await page.evaluate(()=>JSON.stringify({...sessionStorage}));
 expect(stored).toContain('timeless-classic');
 expect(stored).not.toMatch(/email|phone|consent|"name"|details|suburb/i);
});

test('other rooms keep the plain option buttons and shared bathroom links restore the style',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await openStyleStep(page,'kitchen');
 await expect(page.locator('.style-card')).toHaveCount(0);
 await expect(page.locator('.studio-option').first()).toBeVisible();
 await page.goto('/renovation-design-studio?room=bathroom&style=scandinavian');
 await expect(page.locator('.studio-summary')).toContainText('Scandinavian');
 await page.locator('[data-back]').click();
 await expect(page.locator('[data-choice="scandinavian"]')).toHaveAttribute('aria-pressed','true');
 await page.goto('/renovation-design-studio?room=bathroom&style=warm-minimalism');
 await expect(page.locator('.studio-summary')).not.toContainText('Warm minimalism');
});
