// Generates favicons, Apple touch icon and the social share image from the approved logo pack.
// Run: npm run build:brand
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const FOREST = '#073E2B';
const brand = (name) => new URL(`../public/assets/brand/${name}`, import.meta.url);
const out = (name) => new URL(`../public/assets/brand/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const icon = readFileSync(brand('icon-gold-1024.png'));
const logoSvg = readFileSync(brand('logo-gold.svg'));

/** Icon centred on a forest square, with padding so it survives rounded masks. */
async function squareBuffer(size, padRatio) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const mark = await sharp(icon).resize(inner, inner, { fit: 'inside' }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: FOREST } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function square(size, padRatio, file) {
  const buf = await squareBuffer(size, padRatio);
  writeFileSync(out(file), buf);
}

function createIco(pngEntries) {
  const count = pngEntries.length;
  const headerLength = 6;
  const entryLength = 16;
  let offset = headerLength + count * entryLength;

  const header = Buffer.alloc(headerLength);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4); // count

  const entries = [];
  for (const { width, height, buffer } of pngEntries) {
    const entry = Buffer.alloc(entryLength);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngEntries.map((p) => p.buffer)]);
}

await square(32, 0.1, 'favicon-32.png');
await square(192, 0.16, 'icon-192.png');
await square(512, 0.16, 'icon-512.png');
await square(180, 0.14, 'apple-touch-icon.png');

const buf16 = await squareBuffer(16, 0.1);
const buf32 = await squareBuffer(32, 0.1);
const icoBuffer = createIco([
  { width: 16, height: 16, buffer: buf16 },
  { width: 32, height: 32, buffer: buf32 },
]);
const rootFavicon = new URL('../public/favicon.ico', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
writeFileSync(rootFavicon, icoBuffer);

const logo = await sharp(logoSvg, { density: 300 }).resize({ width: 880 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: FOREST } })
  .composite([{ input: logo, gravity: 'centre' }])
  .png({ compressionLevel: 9 })
  .toFile(out('og-image.png'));

console.log('Brand assets and favicon.ico generated.');
