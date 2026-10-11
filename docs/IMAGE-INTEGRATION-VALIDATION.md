# Architectural image integration validation

Captured 2026-10-11. No live enquiry, provider generation, email or database write performed.

## Scope and evidence

All 11 supplied architectural concepts are represented through the central `assets/renovation-concepts.json` manifest and responsive local WebP derivatives. Original approved PNG masters remain outside the public request path. Concept imagery remains labelled as AI-generated inspiration, not completed project evidence.

Before-and-after screenshots cover home, kitchen, bathroom, extensions, whole-home, studio and inspiration at 320, 390 and 1440px: `docs/evidence/images-{before,after}-{home,kitchen,bathroom,extensions,wholehome,studio,inspiration}-{320,390,1440}.png`.

Actual screenshots inspected include narrow mobile home, bathroom, extensions and studio, and desktop kitchen/inspiration. The architectural compositions remain readable; full-width hero crops, studio preview and gallery tiles have no observed overlap. The original gold logo and forest/ruby/cream identity remain. Existing calculator and questionnaire behavior are included in the full regression suite.

## Tests

Focused `npx playwright test tests/e2e/images.spec.js`: 7 passed, 0 failed (14.3 seconds). Checks original/variant measured dimensions, WebP encoding, no upscaling, all 11 images used, responsive currentSrc/srcset/sizes, image decode, meaningful concept alt text, visible concept disclosure, no original PNG requests, at most one high-priority image per route and no horizontal overflow.

Browser checks cover all seven image routes at 320, 390, 768, 1024, 1440 and 1920px. Full Playwright regression result pending completion. Automated axe checks do not certify full accessibility compliance.

## Performance

`docs/evidence/image-performance-lab.json` contains 42 initial navigation measurements (seven routes, six widths), using local unthrottled Chrome, reduced motion and 600ms settling. Observed LCP ranged from 136 to 812ms; maximum initial CLS was 0.0609. These lab timings are sensitive to local load and font arrival and are not production field Core Web Vitals. Image width and height attributes reserve the native aspect ratio; master PNGs are not served to the browser.

## Production boundary

Preview verification is pending deployment. No production branch merge, migration, DNS change, environment change or real enquiry submission was made by QA. Existing platform tests previously passed 91 locally, with eight live checks intentionally disabled. The image feature is being validated independently before release.
