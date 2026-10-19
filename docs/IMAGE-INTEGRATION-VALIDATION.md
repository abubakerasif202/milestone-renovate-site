# Photography overhaul validation — 19 October 2026

Research and screenshots used authorised stock sources, supplied local files and the local repository/dev server. The production website was not crawled, screenshotted, or used as an image/design source. Nothing was pushed or deployed.

## Final collection and provenance

- Inspected 202 existing published image assets (including responsive derivatives and protected branding/team/UI), representing 29 unique original renovation visuals, plus 13 subsequently supplied owner photographs.
- Replaced 19 active AI image identities: 11 shared concepts, six bathroom styles and two comparison images. Retired ten dormant legacy identities as well: 176 obsolete original WebP/AVIF derivatives removed after reference checks.
- Added 29 genuine photographs: **13 explicitly approved as actual Milestone work** and **16 commercially licensed Unsplash inspiration photographs**. Seven interim stock selections were superseded by the owner's photographs before committing.
- Every supplied WhatsApp photograph is used. The homepage kitchen hero, kitchen finishes, bathroom hero, vanity, utility cabinetry and site work feature the supplied collection. Additional bathroom, shower and joinery views are in the gallery. Original Downloads files are untouched.
- The user explicitly confirmed: “Approved for website use; actual Milestone work.” Permission, original filenames, visible subjects and provenance are recorded in `assets/photography/licences.json` and `docs/audits/photography-owner-intake.json`.
- Stock photo pages and commercial permissions were checked individually. Hero/card labels, gallery captions, studio captions, concept pages and the global notice distinguish Milestone photos from inspiration. The stock carpentry photograph is not presented as Milestone staff.
- No project locations, dates, budgets, testimonials, technical certification or before/after continuity were invented. Work-in-progress images are described as such. The existing interactive slider compares two explicitly unrelated stock kitchens, not a renovation transformation.

## Pages and presentation

Main imagery changed on 12 routes: home, services, about, inspiration, kitchen, bathroom, home renovation, extensions, studio and three concept routes. All 22 routes carry the updated image-use disclosure; pages without photography retain their functional layouts. Logo, portraits, palette, typography, navigation and interactions remain intact.

Source/generator files own all output. Photographs are stored locally, offer responsive sizes and intrinsic dimensions, and use stable image frames. AVIF has WebP fallback; studio selectors/previews retain responsive WebP. Page heroes are eager/high priority; below-fold images are lazy. Missing photo keys or files fail the build.

A portrait construction photo initially expanded the mobile About hero; the existing frame now constrains it. A repeated test under load exposed the empty Design Studio board's startup shift; the empty board now reserves space until the module inserts its photographic layout. Three deliberately delayed-startup tests cover that fix. Portrait site-work crops favour the lower part of the photo to retain visible work areas. Local responsive screenshots are in `docs/evidence/photography/local-responsive-review.jpg`.

## Performance

Published renovation imagery decreased from **20,012,417 to 11,526,372 bytes (42.4%)**, despite a larger, partly owner-supplied collection. This is total stored WebP/AVIF derivative size, not one page's transfer size. Masters are outside public output.

The owner-supplied homepage hero's 1024px AVIF is **29,632 bytes**, versus the original AI image's 95,460 bytes (**69.0% smaller**). Its 480px AVIF is 8,165 bytes, versus 24,542 bytes. Each service detail route adds three lazy-loaded supporting photo requests. No production LCP or Lighthouse score is claimed.

All-route local checks cover 375/768/1440px and record CLS, image loading, horizontal overflow, alt/dimension attributes, script errors and external image requests. Final per-route measurements are retained in `docs/evidence/photography/routes-*.json`.

## Validation commands

```powershell
npm.cmd run build:site
node scripts/validate-photography.mjs
npm.cmd test
npx.cmd playwright test
```

Source syntax: `python -m py_compile build_site.py site_experiences.py site_legal.py`; `node --check` on changed JavaScript; `git diff --check`. There is no configured TypeScript compiler or lint script.

The full local browser run intentionally disables `DEPLOYED_URL`; production-only header tests and live lead/email integration tests are skipped. Browser screenshots and raw logs remain in ignored `.tmp/photography/` and `test-results/`.

## Final check results

- Production build: **22 pages generated**; no remote image fallback.
- Image validator: **29 permission/licence records**, **228 referenced image variants**, no missing/remote paths or unused photo identities. Dynamic bathroom style variants also pass their dedicated browser/metadata tests.
- Unit/integration tests: **121 passed, 0 failed**.
- Full browser run: **217 passed, 8 intentionally skipped**, with two tests having loaded the previous inspiration-only hero disclosure expectation before the owner-photo update. Both assertions were updated to the correct Milestone-work label and rerun successfully.
- Final focused browser verification after the final image placements: **23 passed, 0 failed**, including both corrected label assertions, all-route 375/768/1440px checks, master/derivative geometry, AVIF delivery, studio style/keyboard flows and all three delayed-startup checks. Across the full suite and corrected reruns, **219 distinct local browser cases are verified**; no unresolved failure remains.
- Python compilation, changed-JavaScript syntax checks and Git whitespace checks pass. TypeScript/lint scripts are not configured.

Final all-route maximum CLS by width: 375px: 0.0253, 768px: 0.0506, 1440px: 0.0063. No image loading failures, horizontal overflow, browser errors or third-party image requests were observed. These are local samples, not production performance measurements.

## Limits and next steps

The supplied photos establish Milestone work by explicit owner confirmation, but no site-specific case-study information or before/after relationships were supplied. Additional project details and continuity evidence are needed before publishing a named case study or transformation pair. The extension hero still shows licensed Australian residential framing; a documented Milestone extension photograph would strengthen that page. Existing named team portraits are preserved with their original AI-editing disclosure.

SEO titles, canonicals, pricing, analytics, deployment configuration and forms are unchanged. Image-specific descriptions on inspiration/concept routes were corrected to describe photography accurately.
