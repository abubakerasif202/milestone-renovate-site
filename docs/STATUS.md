# Current status — verified 2026-10-13

The single source for what is live, what was checked, and what is still open. Other docs link here instead of repeating test counts.

**Method.** Everything in "Independently verified" was checked on 2026-10-13 (Australia/Sydney) against production commit
`76bdba2` and live services, **read-only**: no enquiry was created, no email was sent, and no database row, environment
variable or service setting was changed. Secret values were never read or printed. Items marked *earlier report* come from
previous sessions' records and were not re-tested on this date.

## Production

| Check | Result |
|---|---|
| PR #11 (forest × gold identity) | Merged 2026-10-12 16:48 UTC; head `63d4238`, merge commit `76bdba2` on `main` |
| Production deployment | `dpl_6Hn3UKrbTQ1gP7H8tkG4B9Me3Xv3`, Ready, built from `main` @ `76bdba2` (Vercel API `githubCommitSha`) |
| Live files = commit | `index.html`, `site.css`, `app.css`, `planning.css`, a concept page: byte-identical to the commit |
| Routes | 22 generated pages (21 in `sitemap.xml` + `/404`) all return 200; an unknown path returns 404; `www` → apex 308 |
| Assets | All 151 distinct assets referenced by those pages (`src`, `href`, `srcset`) return 200 |
| Responsive sweep | 22 routes × 8 widths (320, 375, 390, 430, 768, 1024, 1440, 1920): no document horizontal overflow, no console errors, no load failures |
| Screenshots | Home, cost planner and about inspected at 320, 768 and 1920px; home at 390 and 1440px after deploy |
| Security headers | CSP `default-src 'self'; script-src 'self'; img-src 'self' data:` …, HSTS 1 year, `X-Frame-Options: DENY` present |
| API probes (no body) | `GET /api/enquiries` → 405; `GET /api/notifications/retry` → 401 without the cron secret |

### Lighthouse 12, mobile, production (3 runs each)

| Page | Performance | Accessibility / Best practices / SEO | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|
| `/` | 99, 99, 99 | 100 / 100 / 100 | 1963, 1958, 2070 | 66, 50, 77 | 0 |
| `/bathroom-renovation-cost` | 100, 100, 99 | 100 / 100 / 100 | 1755, 1810, 1830 | 8, 9, 21 | 0 |
| `/about` | 100, 99, 99 | 100 / 100 / 100 | 1874, 1963, 1830 | 52, 0, 0 | 0 |

Lab data (simulated throttling), not field Core Web Vitals; no field INP data was available. Before PR #11 the live home
page scored 99 with LCP 2.0s (one run, 2026-10-12), so the redesign did not change performance.

## Tests (this branch, 2026-10-13)

| Suite | Result |
|---|---|
| `npm test` (unit + integration, incl. real migrations on PGlite) | 121 / 121 pass |
| `npm run test:e2e` (Playwright, Chromium, local dev server) | **201 pass, 0 fail, 10 skipped** in one uninterrupted run (8.6 min). Skipped: 4 `deployed.spec.js` checks (need `DEPLOYED_URL`; run separately below), 4 `integration.spec.js` live-pipeline tests (opt-in `INTEGRATION=1`; they create real leads and email, so deliberately not run), and 2 private-master checks (no `incoming-images/` in a clean clone) |
| `tests/e2e/deployed.spec.js` against `https://milestonerenovate.com` | 4 / 4 pass (headers, image loading under the CSP, honest form error with the API blocked, API routing). All non-GET requests are aborted by the test, so nothing is submitted |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `python build_site.py` | 22 pages, no diff against committed output |

### The three inherited browser-test failures

Before this branch, `images.spec.js` (1 test) and `bathroom-styles.spec.js` (2 tests) failed in every clean checkout with
`Input file is missing: incoming-images/…png`. Cause: they read the private PNG masters, which are deliberately git-ignored
and never deployed (19 files, about 49 MB, present only on the owner's machine). They passed only where those files existed.

Decision: **do not commit the masters** (they are private source files and are not needed to validate what ships) and **do not
replace them with fake fixtures** (that would test nothing real). Instead the tests now validate what is committed and
served, unconditionally: WebP and AVIF formats, measured dimensions, aspect ratio, no upscaling, a full-width variant equal
to the manifest size, AVIF smaller than WebP, and the six bathroom styles visibly distinct (now compared on the committed
full-width variants). The master-dimension checks still exist and run wherever `incoming-images/` is present; elsewhere
they are reported as skipped with the reason, never silently passed.

## Enquiry system (read-only)

| Component | Verified 2026-10-13 |
|---|---|
| Supabase | Project in `ap-southeast-2`, Postgres 17, healthy. Migrations `enquiries` and `notification_outbox` applied. RLS on all three tables (forced on `enquiries`), no policies; `anon`/`authenticated` have no privileges on any table or view. Security advisor: only the three intended "RLS enabled, no policy" INFO notices |
| Stored enquiries | 2 rows (2026-10-11 and 2026-10-12), both with references, both `notification_status = sent` after 1 attempt; 2 status-history events. No `ZZ TEST` rows |
| Outbox health | `enquiry_notification_health`: 2 sent, 0 exhausted, nothing pending or scheduled for retry |
| Resend | Domain `milestonerenovate.com` verified, sending enabled, `ap-northeast-1`, tracking off. All 6 notification emails in the account (10–12 Oct) are `delivered` |
| Cron | `/api/notifications/retry` at `0 20 * * *` (Production). Last scheduled run in logs 2026-10-11 20:00 UTC: claimed 0, sent 0, failed 0, exhausted 0 |
| Function logs | Both stored enquiries show `enquiry.stored` then `enquiry.notified` (attempt 1) within half a second |

**Homepage claim** — "Your enquiry is stored securely and passed to the Milestone team with a reference number." This is
accurate for the operational system. Every form (contact, questionnaire, booking, quote audit) posts through
`js/lib/enquiry-client.js` to `/api/enquiries`; success is returned only after the row is inserted; the reference (`MR-` + 8
characters) is generated server-side, shown to the visitor and included in the staff email subject; the database admits only
the server's service role. "Securely" here means access-controlled storage in Sydney behind RLS, TLS in transit and no raw IPs
stored; it is not a claim of any certification.

## Open items (need a decision or action)

| # | Severity | Item |
|---|---|---|
| 1 | **High (security)** | **Resend API key not rotated.** The site's only send key ("milestone-renovate-site-vercel (send only)") was created 2026-10-10 05:09 UTC, and its value passed through an AI session transcript at creation. The Vercel `RESEND_API_KEY` variables date from the same day. Rotation steps: `DEPLOYMENT.md` → Resend. The key is send-only and restricted to this domain, which limits the impact (sending mail as `@milestonerenovate.com`). |
| 2 | **High (data)** | **Preview deployments use production secrets.** Preview holds the production `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY`, so an enquiry submitted on any branch preview is written to the production database and emails staff. Options: a separate Supabase project and Resend key for Preview, or remove those variables from Preview (the API then answers 503 there). |
| 3 | Medium (data) | **One stored production enquiry is no longer in the database.** Logs show `MR-JKW6Q7RF` stored and notified on the production domain at 2026-10-11 21:12 UTC, and Resend delivered its email, but the row is gone (likewise three from 2026-10-10, consistent with test-lead cleanup). Nothing in the app deletes rows, so it was removed manually. Confirm it was a test; if not, its details survive only in the staff email. |
| 4 | Low | A second Resend key, "Supabase Integration" (created 2026-10-10 10:05 UTC), is not used by the site. Confirm whether Supabase Auth email still needs it; delete if not. |
| 5 | Low | Migration version numbers in Supabase (`20261010050658`, `20261011053951`) differ from the repo filenames (`20261010000000`, `20261011000000`) because they were applied through the dashboard/MCP. Documented in `DEPLOYMENT.md`; keep the mapping when adding migrations. |
| 6 | Low | Retry cron is daily (Hobby-plan limit), so a failed notification can wait up to ~24h. |
| 7 | Business | Calculator ranges are market benchmarks, not approved Milestone rates; all imagery is AI concept art; Search Console registration not verified. |

## Not verified on 2026-10-13

The firewall rate limit and the real submit-to-email pipeline (both need POSTs that create data); Safari/Firefox rendering
(Chromium only); field Core Web Vitals; Search Console indexing; that the private masters still match the manifest (they are
on the owner's machine; the tests run them there).
