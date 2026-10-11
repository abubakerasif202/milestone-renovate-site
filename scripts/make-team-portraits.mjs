// Builds responsive WebP variants of the team portraits (originals are never modified) into public/assets/img/team/.
// Sources live in assets/team/ (outside public/) so nothing is served until TEAM_PORTRAITS_APPROVED
// is switched on in build_site.py. Run: npm run build:team
import sharp from 'sharp';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const src = fileURLToPath(new URL('../assets/team/', import.meta.url));
const out = fileURLToPath(new URL('../public/assets/img/team/', import.meta.url));
const WIDTHS = [480, 800, 1122]; // 1122 is the intrinsic width of the 1122x1402 (4:5) originals
mkdirSync(out, { recursive: true });

const files = readdirSync(src).filter((f) => f.endsWith('.webp'));
for (const file of files) {
  const base = file.replace(/\.webp$/, '');
  for (const width of WIDTHS) {
    // The full-size variant is the supplied portrait byte-for-byte; only smaller sizes are resized.
    if (width === 1122) { copyFileSync(join(src, file), join(out, `${base}-${width}.webp`)); continue; }
    await sharp(join(src, file)).resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(join(out, `${base}-${width}.webp`));
  }
}
console.log(`Generated ${files.length * WIDTHS.length} team portrait variants`);
