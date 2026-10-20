# Bathroom calculator replacement — 19 October 2026

Branch: `feat/bathroom-calculator-replacement`.

## Before / after

| Area | Before | After |
| --- | --- | --- |
| Bathroom pricing | Tier averages, size multipliers, rounded ranges, older-home allowances | Supplied additive model; $20,000–$30,000 / 2–3 weeks default |
| Access | One apartment allowance | Conditional lift; ground resets all apartment adjustments |
| Package / DIY | Labour-only unpriced; one DIY option | Exact labour/all-inclusive package and independent demolition/painting savings |
| Kitchen | Shared bathroom page and controls | Preserved market arithmetic on `/kitchen-renovation-cost`; linked from kitchen service page |
| Quote CTA | Questionnaire handoff into storage-first flow | Existing `/api/enquiries`, email-only calculator branch; server recomputes; contact fallback carries options |
| Legacy scope engine | Unused weighted estimator and latent alternate price path | Removed; non-price choice lists retained for saved briefs |
| Presentation | Old calculator-specific UI and stylesheet | Existing Milestone type, branding and navigation; accessible radios/checks, sticky desktop summary, mobile stack |

The bathroom URL, title, meta description, canonical, indexability and navigation are preserved.
The kitchen guide is added to the generated sitemap. No redirect, deployment or secret change.
The local `.claude/` user directory is excluded from this work.

## Key files

- `public/js/lib/bathroom-calculator.js`: immutable deltas, pure calculator, shared contact checks and brief.
- `site_calculator.py`, `build_site.py`: generated bathroom and separate kitchen page shells.
- `public/js/bathroom-calculator-ui.js`, `public/css/calculator.css`: interaction and presentation.
- `lib/bathroom-enquiry.js`, `lib/enquiry-handler.js`, `api/enquiries.js`: strict email-only calculator branch.
- `lib/notifier.js`: existing Resend adapter; source-page row; no empty reply address for phone-only requests.
- `public/js/enquiry-form.js`, `public/js/wizard-ui.js`: safe contact fallback and bathroom calculator link.
- `site_legal.py`: calculator-specific privacy/email-storage distinction, methodology and tax wording reconciled with the replacement.
- `tests/bathroom-*.test.js`, `tests/e2e/calculator.spec.js`: exact fixtures, server trust boundary, delivery failures and UI coverage.

The obsolete bathroom market-price tests and weighted-estimator fixture tests were replaced with the
new exact-model tests; kitchen arithmetic tests remain. Non-bathroom questionnaire flows are retained.

## Example totals

| Selection | AUD range | Weeks |
| --- | --- | --- |
| Defaults | $20,000–$30,000 | 2–3 |
| Medium only | $22,000–$32,000 | 2.5–3.5 |
| Both DIY savings only | $16,500–$26,500 | 1.5–2.5 |
| Large + slab + stairs + all add-ons + all-inclusive | $36,600–$46,600 | 5.5–6.5 |
| Same + both DIY savings | $33,100–$43,100 | 5–6 |

All nine supplied numerical fixtures are tested. Browser tests also verify returning from stairs to
ground, reset, live summary, keyboard operation, responsive layouts, validation, payload, retry,
provider failure, honest acceptance text, contact fallback and kitchen handoff.

## Email boundary and outstanding operational verification

No live customer enquiry or email was sent. Local `.env.local` does not contain the required Resend
key, notification recipient/sender or IP-hashing secret. Production values were not inspected or
changed. Live recipient configuration and inbox delivery therefore remain **unverified**.

The route requires existing `RESEND_API_KEY`, `NOTIFY_TO_EMAIL`, `NOTIFY_FROM_EMAIL`, `IP_HASH_SECRET`.
`NOTIFY_TO_EMAIL` should be the existing configured Milestone recipient (`admin@milestonerenovate.com`).
Missing configuration returns 503. A failed provider call never returns success. A successful call
means provider HTTP acceptance, explicitly not proof of inbox delivery. The contact link retains a
validated estimate and selected options, without names, emails or phone numbers in the URL.

No Supabase calls are made for the calculator branch, and no table or migration is created.
Existing unrelated enquiry storage is preserved. Calculator rate limiting is bounded, HMAC-keyed,
instance-local (5 attempts/hour); it is not a cross-instance quota. Resend's stable idempotency key
protects retries across instances. There is no new durable lead/retry store; failed requests require
visitor retry or contact/phone. Confirm live delivery in an approved operational check before release.

## Performance and local evidence

`docs/evidence/bathroom-calculator/asset-comparison.json` compares the previous Git revision's
calculator module closure with the new bathroom closure, excluding unchanged shared site assets:

- JavaScript: 52,929 → 13,508 raw bytes (about 75% reduction).
- Calculator CSS: 18,489 → 2,311 raw bytes (about 88% reduction).
- Per-file gzip estimates: JS 19,031 → 5,324; CSS 5,142 → 1,005 bytes. Actual transfer compression depends on hosting.

Local Chrome captures/metrics cover 320, 375, 768 and 1440 pixels. They recorded no page errors,
external requests, horizontal overflow or layout shift. Local paint timings are lab observations,
not a production Core Web Vitals result. The production site was not used as a visual reference.

## Validation commands

Run from the repository; Windows Node is used for the installed native/dependency tooling:

```powershell
python build_site.py
npm.cmd test
npx.cmd playwright test
node --check public/js/bathroom-calculator-ui.js
node --check public/js/lib/bathroom-calculator.js
node --check lib/bathroom-enquiry.js
node scripts/validate-photography.mjs
python -m py_compile build_site.py site_calculator.py site_legal.py
git diff --check
```

There is no TypeScript, ESLint or formatter configuration in this static project. JavaScript syntax,
Python compilation, whitespace checks, unit/integration tests and Playwright provide its applicable gates.

## Verification results

- Final static build: 23 pages generated; no remote images.
- Windows Node unit/integration suite: **110 passed, zero failures**.
- Full local Playwright regression: **210 passed, 8 intentionally skipped, zero failures** (10.1 minutes).
- Final calculator and legal-page pass after the final changes: **24 passed, zero failures**.
- The eight skips are four production-only checks and four real-service integration checks; none were enabled and no real enquiries were sent.
- Responsive calculator axe/keyboard checks pass at 320, 375, 768 and 1440 pixels. Full regression also checks all routes across wider breakpoints.
- Photography validation: 23 routes, 228 referenced image variants, 29 commercial-use records; no missing/remote images or unused photographs.
- Changed JavaScript syntax checks, Python compilation and Git whitespace checks pass. No TypeScript/linter/formatter setup exists to run.
- Manual local desktop/mobile screenshot review passed. No production visual reference was used.
- Final review checked server trust boundaries, HTML escaping, phone-only email, configuration failure, idempotent/concurrent retry, anti-spam, no database storage in the calculator path and preserved non-bathroom flows.
