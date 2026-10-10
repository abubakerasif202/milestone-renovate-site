// Generates 640/1024/1440px WebP variants of the illustrative photography for srcset use.
// Run: npm run build:images   (source files stay untouched; variants are written alongside them)
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../public/assets/img/', import.meta.url));
const WIDTHS = [640, 1024, 1440];
const sources = readdirSync(dir).filter((f) => f.endsWith('.webp') && !/-\d+\.webp$/.test(f));

for (const file of sources) {
  const base = file.replace(/\.webp$/, '');
  for (const width of WIDTHS) {
    await sharp(join(dir, file)).resize({ width, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(join(dir, `${base}-${width}.webp`));
  }
}
console.log(`Generated ${sources.length * WIDTHS.length} responsive variants`);
