// Rebuild local responsive photography from licensed, committed masters.
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const licencePath=resolve(root,'assets/photography/licences.json');
const licences=JSON.parse(await readFile(licencePath,'utf8'));
const styleIds=['contemporary-australian','industrial','mediterranean','modern-luxury','timeless-classic','scandinavian'];
const previous=JSON.parse(await readFile(resolve(root,'assets/bathroom-styles.json'),'utf8'));
const main=[],styles=[];
await mkdir(resolve(root,'public/assets/img/photography'),{recursive:true});
for(const record of licences.images){
 if(!record.commercialUse||!['Unsplash License','Owner-authorised commercial website use'].includes(record.licence))throw new Error(`Unapproved licence: ${record.id}`);
 const source=resolve(root,record.source),meta=await sharp(source).metadata();
 const width=Math.min(meta.width,1448),height=Math.round(meta.height*width/meta.width);
 const image={id:record.id,source:record.source,filename:record.filename,width,height,status:record.status,alt:record.alt,position:['construction','site-floor','shower-preparation'].includes(record.id)?'50% 75%':'50% 50%',variants:[]};
 const isStyle=styleIds.includes(record.id),widths=isStyle?[480,768,width]:[480,768,1024,1280,width];
 for(const w of [...new Set(widths.filter(w=>w<=width))].sort((a,b)=>a-b)){
  const stem=`/assets/img/photography/${record.filename}${w===width?'':'-'+w}`;
  const webp=await sharp(source).rotate().resize({width:w,withoutEnlargement:true}).webp({quality:77,effort:6}).toBuffer({resolveWithObject:true});
  let quality=44,avif;
  do{avif=await sharp(source).rotate().resize({width:w,withoutEnlargement:true}).avif({quality,effort:5}).toBuffer();quality-=5;}while(avif.length>=webp.data.length&&quality>=19);
  await writeFile(resolve(root,'public'+stem+'.webp'),webp.data);await writeFile(resolve(root,'public'+stem+'.avif'),avif);
  image.variants.push({width:webp.info.width,height:webp.info.height,src:stem+'.webp',bytes:webp.data.length,avif:{src:stem+'.avif',bytes:avif.length}});
 }
 record.localFiles=image.variants.flatMap(v=>[v.src,v.avif.src]);
 if(isStyle){const old=previous.images.find(i=>i.style===record.id);styles.push({...image,style:record.id,label:old.label,summary:record.alt.replace(/^Bathroom with /,'').replace(/^Bathroom /,'')+'.'});}else main.push(image);
}
styles.sort((a,b)=>styleIds.indexOf(a.style)-styleIds.indexOf(b.style));
await writeFile(resolve(root,'assets/renovation-concepts.json'),JSON.stringify({version:1,widths:[480,768,1024,1280,1448],images:main},null,2)+'\n');
await writeFile(resolve(root,'assets/bathroom-styles.json'),JSON.stringify({version:1,widths:[480,768,1448],images:styles},null,2)+'\n');
await writeFile(licencePath,JSON.stringify(licences,null,2)+'\n');
console.log(`Built ${main.length+styles.length} licensed photographs with responsive WebP/AVIF variants.`);
