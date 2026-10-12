import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import sharp from 'sharp';
const manifest=JSON.parse(readFileSync(new URL('../../assets/renovation-concepts.json',import.meta.url)));
const paths=['/','/kitchen-renovations','/bathroom-renovations','/extensions','/home-renovations','/renovation-design-studio','/inspiration'];
// The PNG masters are private and git-ignored (incoming-images/), so a fresh clone or CI run cannot read them.
// Everything that is committed and served is validated unconditionally; the masters are checked only where present.
const mastersPresent=manifest.images.every(image=>existsSync(image.source));
test('committed WebP and AVIF variants retain the manifest dimensions and are never upscaled',async()=>{
 expect(manifest.images).toHaveLength(11);
 for(const image of manifest.images){
  expect(image.status).toBe('ai-generated-concept');
  expect(image.variants.map(v=>v.width).at(-1),image.id).toBe(image.width); // a full-width variant preserves the master's measured size
  for(const variant of image.variants){const meta=await sharp(`public${variant.src}`).metadata();expect(meta.format).toBe('webp');expect(meta.width).toBe(variant.width);expect(meta.height).toBe(variant.height);expect(variant.width).toBeLessThanOrEqual(image.width);
   expect(Math.abs(variant.width/variant.height-image.width/image.height),variant.src).toBeLessThan(0.01);
   // Every WebP has an AVIF sibling of identical dimensions (scripts/build-concept-avif.mjs) that is smaller than the WebP.
   const avif=await sharp(`public${variant.avif.src}`).metadata();expect(avif.format).toBe('heif');expect(avif.compression).toBe('av1');expect(avif.width).toBe(variant.width);expect(avif.height).toBe(variant.height);
   expect(variant.avif.bytes).toBeLessThan(variant.bytes);}
 }
});
test('private PNG masters match the manifest (runs only where incoming-images/ is present)',async()=>{
 test.skip(!mastersPresent,'incoming-images/ masters are git-ignored and not present in this checkout');
 for(const image of manifest.images){const original=await sharp(image.source).metadata();expect(original.width,image.id).toBe(image.width);expect(original.height,image.id).toBe(image.height);}
});
for(const width of [320,390,768,1024,1440,1920])test(`approved image network, crops and semantics at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const used=new Set();
 for(const path of paths){
  const requested=[];page.on('request',record);function record(request){if(request.resourceType()==='image')requested.push(request.url());}
  expect((await page.goto(path)).status()).toBe(200);
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});}))); 
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  const images=await page.locator('img[src*="renovation-concepts"]').evaluateAll(imgs=>imgs.map(i=>({src:i.src,current:i.currentSrc,srcset:i.srcset,sizes:i.sizes,alt:i.alt,width:i.getAttribute('width'),height:i.getAttribute('height'),loaded:i.complete&&i.naturalWidth>0,objectFit:getComputedStyle(i).objectFit,position:getComputedStyle(i).objectPosition})));
  expect(images.length,path).toBeGreaterThan(0);
  for(const image of images){
   const item=manifest.images.find(entry=>image.src.includes(entry.filename));expect(item, image.src).toBeTruthy();used.add(item.id);expect(image.loaded,image.src).toBe(true);expect(image.alt).toMatch(/concept/i);expect(image.width).toBe(String(item.width));expect(image.height).toBe(String(item.height));expect(image.srcset).toContain('480w');expect(image.sizes).not.toBe('');expect(item.variants.some(v=>image.current.endsWith(v.src)||image.current.endsWith(v.avif.src)),image.current).toBe(true);
  }
  expect(requested.filter(url=>/incoming-images|ChatGPT|\.png(?:$|\?)/i.test(url)&&!url.includes('/brand/'))).toEqual([]);
  expect(await page.locator('img[fetchpriority="high"]').count()).toBeLessThanOrEqual(1);
  await expect(page.locator('main')).toContainText(/concept/i);
  page.off('request',record);
 }
 expect(used.size).toBe(11);
});
