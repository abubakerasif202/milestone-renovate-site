# Interactive platform baseline

> **Historical record.** Dated evidence from an earlier phase; test counts, palette and deployment statements below are as of that date and are superseded by [`STATUS.md`](STATUS.md) (current verified status) and [`DESIGN.md`](../DESIGN.md).


Captured 2026-10-11 with installed Chrome through Playwright. Read-only visits; no production enquiry, email, database write or provider call.

## Production baseline

Home, `/bathroom-renovation-cost` and `/plan-your-renovation` return HTTP 200 at 390 and 1440px. No document horizontal overflow detected at these widths. Milestone before screenshots are committed in `docs/evidence/before-{home,planner,questionnaire}-*.png`. Reference-site screenshots and the raw comparison metadata remain local evidence and are excluded from the feature branch.

The existing bathroom planner offers relative scope rather than pricing. The questionnaire has nine steps; existing fixtures and source enums need extension for design preferences. The home page already has strong editorial typography, cream/forest branding and concept imagery; new features should preserve these foundations.

## Reference UX observations

Both requested reference pages were inspected read-only at 390 and 1440px. The cost tool groups size, construction, access and extras alongside a result panel. Its initial results are question marks and the CTA waits for five required groups. Useful principle: keep drivers visible beside results; improve this with immediate scope explanations and clear uncertainty rather than withholding all value. Its market pricing claims are not Milestone evidence.

The reference designer exposes a 14-step progress indicator, image selection cards and a helper prompt. At capture some style images appeared blank. Useful principle: reduce each decision to a small visual group, provide a persistent progress indicator and a useful summary. Milestone should use its own palettes, assets, wording and navigation, with honest non-generative fallback.

## Integration and configuration

`api/enquiries.js` wraps `lib/enquiry-handler.js`; the existing schema is strict Zod validation. Store and notification services handle idempotency, storage-before-notification, resilient retries and outbox leasing. Existing SQL migrations contain enquiry and notification-outbox setup. Changes should extend the validated wizard JSON boundary without changing RLS or applying production migrations.

The local `.env.local` contains only the name `VERCEL_OIDC_TOKEN`; no configured image-generation API variable was found locally. `.env.example` documents server-only Supabase, HMAC, Resend, cron and allowed-origin variables. Values were not printed or copied. Subsequent read-only Vercel Preview/Production environment-name checks confirmed no image-provider configuration; values were not retrieved.

The local dev server uses an in-memory lead store and mock notifier and refuses production mode. It is suitable for form and retry regression testing without live email.

## Baseline validation

`npm test`: 67 passed, 0 failed, 3.65 seconds. Includes local PGlite RLS checks (service role allowed; anon/authenticated denied), constraints, idempotency, API error handling, retry leasing, questionnaire validation and private draft filtering.

Safety finding: `tests/e2e/deployed.spec.js` contains a real enquiry POST check. Do not run the full deployed suite against production; use read-only checks or intercepted requests for preview verification.

This baseline does not establish WCAG compliance, field Core Web Vitals, approved pricing or working production email delivery.
