// Run with node scripts/build-bathroom-styles.mjs. PNG masters stay untouched and are never published.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'assets/bathroom-styles.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const outputDir = resolve(root, 'public/assets/img/bathroom-styles');
if (manifest.version !== 1 || manifest.images.length !== 6) {
  throw new Error('Expected the version 1 manifest with all six bathroom styles.');
}

// Validate every master first; a missing style image is reported, never substituted.
const missing = [];
for (const image of manifest.images) {
  try {
    const metadata = await sharp(resolve(root, image.source)).metadata();
    if (!metadata.width || !metadata.height || metadata.format !== 'png') throw new Error('not a PNG');
    image.width = metadata.width;
    image.height = metadata.height;
  } catch {
    missing.push(`${image.style}: ${image.source}`);
  }
}
if (missing.length) throw new Error(`Missing or unreadable style masters:\n${missing.join('\n')}`);

await mkdir(outputDir, { recursive: true });
for (const image of manifest.images) {
  const widths = [...new Set([...manifest.widths.filter((width) => width < image.width), image.width])];
  image.variants = [];
  for (const width of widths) {
    const filename = width === image.width ? `${image.filename}.webp` : `${image.filename}-${width}.webp`;
    const output = resolve(outputDir, filename);
    const info = await sharp(resolve(root, image.source))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(output);
    image.variants.push({ width: info.width, height: info.height,
      src: `/assets/img/bathroom-styles/${filename}`, bytes: (await stat(output)).size });
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${manifest.images.length} bathroom styles, ${manifest.images.reduce((count, image) => count + image.variants.length, 0)} responsive variants.`);
