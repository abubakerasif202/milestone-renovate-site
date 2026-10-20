import {test,expect} from '@playwright/test';
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const routes=walk('public').filter(f=>f.endsWith('.html')).map(f=>'/'+f.replace(/^public[\\/]/,'').replaceAll('\\','/').replace(/index\.html$/,'').replace(/\.html$/,''));
for(const width of [375,768,1440])test(`all ${routes.length} local routes: photography at ${width}px`,async({page},testInfo)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 const results=[];const external=[],failures=[];
 page.on('request',r=>{if(r.resourceType()==='image'&&!r.url().startsWith('http://127.0.0.1:4173/')&&!r.url().startsWith('data:'))external.push(r.url());});
 page.on('pageerror',e=>failures.push(e.message));
 await page.addInitScript(()=>{window.photoCLS=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.photoCLS+=e.value;}).observe({type:'layout-shift',buffered:true});});
 for(const route of routes){
  expect((await page.goto(route)).status(),route).toBe(200);
  if(route==='/renovation-design-studio')await expect(page.locator('[data-studio-app] .studio-layout')).toBeVisible();
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));await page.waitForTimeout(150);
  const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,cls:window.photoCLS,images:[...document.images].map(i=>({src:i.currentSrc,ok:i.complete&&i.naturalWidth>0,alt:i.getAttribute('alt'),width:i.getAttribute('width'),height:i.getAttribute('height'),fit:getComputedStyle(i).objectFit}))}));
  expect(state.overflow,route).toBeLessThanOrEqual(0);expect(state.cls,route).toBeLessThan(0.1);
  for(const i of state.images){expect(i.ok,route+' '+i.src).toBe(true);expect(i.alt,route).not.toBeNull();expect(i.width).toBeTruthy();expect(i.height).toBeTruthy();}
  results.push({route,images:state.images.length,cls:state.cls});
  if(['/', '/kitchen-renovations','/bathroom-renovations','/extensions','/about','/inspiration','/home-renovations'].includes(route)){
   await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,25));}scrollTo(0,0);});
   await page.screenshot({path:testInfo.outputPath(`photography-${route.replaceAll('/','')||'home'}-${width}.png`),fullPage:true});
  }
 }
 expect(external).toEqual([]);expect(failures).toEqual([]);
 await testInfo.attach('route-results',{body:JSON.stringify(results,null,2),contentType:'application/json'});
 mkdirSync('.tmp/photography',{recursive:true});writeFileSync(`.tmp/photography/qa-${width}.json`,JSON.stringify(results,null,2));
});

for(const width of [375,768,1440])test(`studio reserves its photographic board during delayed startup at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/js/design-studio.js',async route=>{await new Promise(r=>setTimeout(r,600));await route.continue();});
 await page.addInitScript(()=>{window.startupCLS=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.startupCLS+=e.value;}).observe({type:'layout-shift',buffered:true});});
 await page.goto('/renovation-design-studio');await expect(page.locator('[data-studio-app] .studio-layout')).toBeVisible();
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));await page.waitForTimeout(200);
 expect(await page.evaluate(()=>window.startupCLS)).toBeLessThan(0.1);
});
