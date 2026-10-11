// Run with node scripts/build-renovation-concepts.mjs. Approved PNG masters stay untouched.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'assets/renovation-concepts.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const outputDir = resolve(root, 'public/assets/img/renovation-concepts');
if (manifest.version !== 1 || manifest.images.length !== 11) {
  throw new Error('Expected the version 1 manifest with all 11 approved concepts.');
}

// Validate every source before producing outputs; never substitute missing artwork.
for (const image of manifest.images) {
  const metadata = await sharp(resolve(root, image.source)).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== 'png') {
    throw new Error(`Unreadable PNG master: ${image.source}`);
  }
  image.width = metadata.width;
  image.height = metadata.height;
}
await mkdir(outputDir, { recursive: true });
for (const image of manifest.images) {
  const widths = [...new Set([...manifest.widths.filter(width => width <= image.width), image.width])];
  image.variants = [];
  for (const width of widths) {
    const filename = width === image.width ? `${image.filename}.webp` : `${image.filename}-${width}.webp`;
    const output = resolve(outputDir, filename);
    const info = await sharp(resolve(root, image.source))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 83, effort: 6 })
      .toFile(output);
    image.variants.push({ width: info.width, height: info.height,
      src: `/assets/img/renovation-concepts/${filename}`, bytes: (await stat(output)).size });
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${manifest.images.length} approved concepts, ${manifest.images.reduce((count, image) => count + image.variants.length, 0)} responsive variants.`);
