// Generates favicons, Apple touch icon and the social share image from the approved logo pack.
// Run: npm run build:brand
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const FOREST = '#073E2B';
const brand = (name) => new URL(`../public/assets/brand/${name}`, import.meta.url);
const out = (name) => new URL(`../public/assets/brand/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const icon = readFileSync(brand('icon-gold-1024.png'));
const logoSvg = readFileSync(brand('logo-gold.svg'));

/** Icon centred on a forest square, with padding so it survives rounded masks. */
async function square(size, padRatio, file) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const mark = await sharp(icon).resize(inner, inner, { fit: 'inside' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: FOREST } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(out(file));
}

await square(32, 0.1, 'favicon-32.png');
await square(192, 0.16, 'icon-192.png');
await square(512, 0.16, 'icon-512.png');
await square(180, 0.14, 'apple-touch-icon.png');

const logo = await sharp(logoSvg, { density: 300 }).resize({ width: 880 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: FOREST } })
  .composite([{ input: logo, gravity: 'centre' }])
  .png({ compressionLevel: 9 })
  .toFile(out('og-image.png'));

console.log('Brand assets generated.');
