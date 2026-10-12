# Interactive platform validation

> **Historical record.** Dated evidence from an earlier phase; test counts, palette and deployment statements below are as of that date and are superseded by [`STATUS.md`](STATUS.md) (current verified status) and [`DESIGN.md`](../DESIGN.md). The platform is now in production.


## Evidence

Production baseline: `INTERACTIVE-BASELINE.md` and `evidence/before-{home,planner,questionnaire}-*.png`. Local completed implementation: `evidence/after-{home,planner,questionnaire,studio}-{320,390,1440}.png`. Demonstrations: `evidence/demo-design-summary-1440.png` and `evidence/demo-planner-complex-1440.png`.

Screenshots were inspected visually at 320, 390 and 1440px. The homepage preserves its original identity and now surfaces planning tools early. The planner shows measurements, choices, scenario comparisons and uncertainty alongside scope results. The studio presents swatches, concept imagery and a complete design summary. No overlap was observed. Parent-company references remain. Home baseline and final screenshots explicitly revealed sections and settled images.

## Automated checks

Original unit baseline: 67/67 passed. Read-only local studio share interaction confirmed the design link was copied and contains selections only. Final unit result from release owner: 82/82 passed; npm audit 0 vulnerabilities; deterministic generation matched all 20 generated files. Final `npm run test:e2e`: 91 passed, 8 intentionally skipped, 0 failed (99 total, 2.8 minutes). The skipped tests require deployed/live submission configuration; includes six requested widths, axe scans, image decode, internal links, canonical metadata, questionnaire data handoff, draft privacy, blocked storage, category changes, keyboard controls, API submission and network failure/retry handling through the local in-memory server. Deployed/live submission tests remain intentionally disabled.

The six-width interactive scan covers `/`, `/bathroom-renovation-cost`, `/renovation-design-studio`, `/plan-your-renovation` and three `/concepts/*` routes. Existing broader suite covers other public pages, mobile focus traps and form error states. Automated axe findings do not establish full accessibility compliance.

## Local lab performance

Chrome, unthrottled localhost, new browser contexts, 1 second settling; these are not field Core Web Vitals. Latest measurement data: `evidence/performance-lab.json`.

| Route | Width | LCP | Initial CLS | Initial JS transfer | Resource transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 390 | 628 ms | 0 | 25.4 KB | 378.8 KB |
| Planner | 390 | 576 ms | 0.0465 | 30.6 KB | 275.0 KB |
| Studio | 390 | 256 ms | 0.0037 | 36.2 KB | 328.0 KB |
| Home | 1440 | 476 ms | 0.0367 | 25.4 KB | 478.7 KB |
| Planner | 1440 | 604 ms | 0.0029 | 30.6 KB | 275.0 KB |
| Studio | 1440 | 336 ms | 0.0029 | 36.2 KB | 328.0 KB |

Lighthouse CLI is not installed; no Lighthouse score is claimed. Initial navigation measurements exclude later lazy images and may vary with font loading and concurrent local tests.

## Provider and integration limits

The release owner inspected Preview and Production environment variable names and found no configured image-generation provider. The studio is a non-generative visual moodboard using labelled local concept assets; no paid image API is called. No approved pricing or construction-duration assumptions were found, so planner output remains relative scope with no dollar or duration fabrication.

Database and notification behavior are tested locally with PGlite and in-memory mocks. No production database migration, enquiry submission, live email, DNS change or environment change was performed for QA. Real delivery remains unproven by this run. Preview verification is pending deployment.
