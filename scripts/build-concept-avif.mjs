// Adds AVIF siblings next to every approved WebP concept variant (WebP files and PNG masters are left untouched).
// For each variant the lowest AVIF quality whose SSIM against the PNG master is within TOLERANCE of the shipped WebP's is chosen
// (SSIM tracks perceived quality far better than PSNR, which AVIF's smoothing penalises), so the smaller file is never
// a visible downgrade. Records `avif: { src, bytes }` on each manifest variant.
// Run after build-renovation-concepts.mjs (which rewrites the manifest and drops these fields):
//   node scripts/build-concept-avif.mjs
import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'assets/renovation-concepts.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const SEARCH_EFFORT = 4;
const FINAL_EFFORT = 6;
const TOLERANCE = 0.006; // SSIM headroom below the q83 WebPs (about the q74 level the repo already uses for other responsive imagery)

async function luma(input, width, height) {
  return sharp(input).resize({ width, height, fit: 'fill' }).greyscale().raw().toBuffer();
}

/** Mean SSIM over 8x8 windows (stride 4) of 8-bit luma. */
function ssim(a, b, width, height) {
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let sum = 0, count = 0;
  for (let y = 0; y + 8 <= height; y += 4) {
    for (let x = 0; x + 8 <= width; x += 4) {
      let ma = 0, mb = 0, saa = 0, sbb = 0, sab = 0;
      for (let j = 0; j < 8; j++) {
        const row = (y + j) * width + x;
        for (let i = 0; i < 8; i++) { const p = a[row + i], q = b[row + i]; ma += p; mb += q; saa += p * p; sbb += q * q; sab += p * q; }
      }
      ma /= 64; mb /= 64;
      const va = saa / 64 - ma * ma, vb = sbb / 64 - mb * mb, cov = sab / 64 - ma * mb;
      sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      count++;
    }
  }
  return sum / count;
}

const encode = (master, width, quality, effort) =>
  sharp(master).resize({ width, withoutEnlargement: true }).avif({ quality, effort }).toBuffer();

let total = { webp: 0, avif: 0 };
for (const image of manifest.images) {
  const master = await readFile(resolve(root, image.source));
  for (const variant of image.variants) {
    const { width, height } = variant;
    const webpPath = resolve(root, 'public', variant.src.replace(/^\//, ''));
    const webp = await readFile(webpPath);
    const reference = await luma(master, width, height);
    const target = ssim(reference, await luma(webp, width, height), width, height) - TOLERANCE;
    // Binary search the lowest quality that still meets the target.
    let lo = 20, hi = 85;
    while (hi - lo > 2) {
      const mid = (lo + hi) >> 1;
      const score = ssim(reference, await luma(await encode(master, width, mid, SEARCH_EFFORT), width, height), width, height);
      if (score >= target) hi = mid; else lo = mid;
    }
    const buf = await encode(master, width, hi, FINAL_EFFORT);
    const score = ssim(reference, await luma(buf, width, height), width, height);
    const src = variant.src.replace(/\.webp$/, '.avif');
    const out = resolve(root, 'public', src.replace(/^\//, ''));
    await writeFile(out, buf);
    variant.avif = { src, bytes: (await stat(out)).size };
    total.webp += webp.length; total.avif += buf.length;
    console.log(`${image.id.padEnd(11)} ${String(width).padStart(4)}w WebP ${String(Math.round(webp.length / 1024)).padStart(4)}KB ssim ${(target + TOLERANCE).toFixed(4)} -> AVIF q${hi} ${String(Math.round(buf.length / 1024)).padStart(4)}KB ssim ${score.toFixed(4)}`);
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Total WebP ${Math.round(total.webp / 1024)}KB -> AVIF ${Math.round(total.avif / 1024)}KB (${Math.round((1 - total.avif / total.webp) * 100)}% smaller)`);
