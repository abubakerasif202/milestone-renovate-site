# Approved architectural concepts

All 11 approved concepts are indexed in `assets/renovation-concepts.json`, including original filenames, private semantic master paths, dimensions, placements, alt text, focal position and AI concept status. Timestamped originals supplied in `public/assets/img` were preserved unchanged and excluded from the feature commit. Identical semantic masters are retained in `incoming-images/renovation-concepts` outside the published output.

Rebuild derivatives with `node scripts/build-renovation-concepts.mjs`, then run `python build_site.py`. Sharp was already installed. Quality 83, effort 6; metadata is stripped. All sources are 1448 x 1086. Five widths per image (480, 768, 1024, 1280, 1448) produce 55 WebPs without upscaling. The original-width variant uses the descriptive filename without a size suffix. Existing one-year immutable asset caching is retained; these assets have new names. Changed masters require new filename identities before future deployment.

Primary placements: living homepage hero; olive kitchen kitchen page; spa bathroom bathroom page; waterfront extension extensions page; workspace studio/planning; open-plan interior whole-home page; bedroom, entrance, vanity, staircase and terrace inspiration gallery. The homepage also uses distinct detail/entrance/staircase views. All images remain explicitly conceptual. No new claim of completed work or generated user-specific design is made.

Generator source owns all responsive references. Images have srcset/sizes, intrinsic dimensions, focal crops, stable frames and lazy loading below the fold. Only justified page hero imagery uses high loading priority. Reduced-motion preferences disable image effects. Original logo, typography, palette, business facts, existing comparative concepts and API/database contracts remain intact.

The images are in production. AVIF siblings of every WebP are built by `scripts/build-concept-avif.mjs` and offered first.

## Masters and tests

The PNG masters live only in `incoming-images/` (git-ignored, never deployed; about 49 MB for 19 files on the owner's machine). `tests/e2e/images.spec.js` and `tests/e2e/bathroom-styles.spec.js` validate the committed WebP/AVIF variants unconditionally (format, measured dimensions, aspect ratio, no upscaling, a full-width variant equal to the manifest size, AVIF smaller than WebP, six visibly distinct style images). The master-dimension checks run only where `incoming-images/` is present and are reported as skipped elsewhere, so a fresh clone or CI run is reproducible. Before replacing a master, keep `width`/`height` in the manifest in step and rebuild the variants.
