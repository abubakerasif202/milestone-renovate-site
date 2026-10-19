// Check every published page, local image reference, and commercial licence record.
import {readFile,readdir,writeFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),pub=resolve(root,'public');
const walk=async d=>(await Promise.all((await readdir(d,{withFileTypes:true})).map(e=>e.isDirectory()?walk(resolve(d,e.name)):[resolve(d,e.name)]))).flat();
const files=await walk(pub),pages=files.filter(f=>f.endsWith('.html'));
const licenceFile=resolve(root,'assets/photography/licences.json'),manifest=JSON.parse(await readFile(licenceFile,'utf8'));
const errors=[],used=new Set();
for(const r of manifest.images){
 r.pages=[];
 const stock=r.licence==='Unsplash License'&&r.sourceUrl?.startsWith('https://unsplash.com/photos/');
 const owner=r.licence==='Owner-authorised commercial website use'&&r.sourceKind==='user-provided'&&r.status==='owner-confirmed-milestone-work'&&r.verification.includes('User explicitly confirmed');
 if(!r.commercialUse||!(stock||owner)||!r.creator||!r.retrieved)errors.push(`Invalid licence: ${r.id}`);
}
for(const page of pages){const html=await readFile(page,'utf8');
 for(const match of html.matchAll(/<(?:img|source)\b[^>]*>/g)){
  const tag=match[0];if(tag.startsWith('<img')&&(!/\balt="/.test(tag)||!(/\bwidth="\d+"/.test(tag)&&/\bheight="\d+"/.test(tag))))errors.push(`Missing image semantics: ${page}: ${tag}`);
  for(const value of tag.matchAll(/\b(?:src|srcset)="([^"]+)"/g))for(const entry of value[1].split(',')){
   const url=entry.trim().split(/\s+/)[0];if(!url.startsWith('/')||url.startsWith('//')){errors.push(`Remote image: ${url}`);continue;}
   try{await stat(resolve(pub,'.'+url));}catch{errors.push(`Missing image ${url} in ${page}`);}used.add(url);
  }
 }
 for(const record of manifest.images)if(html.includes('/photography/'+record.filename))record.pages.push('/'+relative(pub,page).replace(/index\.html$/,'').replace(/\.html$/,''));
}
for(const record of manifest.images)if(!record.pages.length)errors.push(`Unused photograph: ${record.id}`);
if(errors.length)throw new Error(errors.join('\n'));
await writeFile(licenceFile,JSON.stringify(manifest,null,2)+'\n');
console.log(`Validated ${pages.length} routes, ${used.size} referenced image variants, ${manifest.images.length} commercial-use records; no missing/remote images or unused photographs.`);
