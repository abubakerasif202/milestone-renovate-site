# Implementation roadmap

Status key: ✅ done · 🟡 built, needs external config/verification · ⬜ planned · 🔴 open issue. Current test counts and the dated
evidence behind each status live in [`STATUS.md`](STATUS.md); counts are not repeated here so they cannot go stale.

## Phase 1 — Production-ready foundation (Audit Fixes Verified)
- ✅ Root `favicon.ico` (16x16 and 32x32 frames packed in binary ICO) and `site.webmanifest` generated from approved brand assets.
- ✅ Approved gold logo in header, footer, favicons, Apple touch icon, OG/Twitter image (local WebP/PNG assets).
- ✅ Brand palette (primary forest `#0F201D`, secondary forest `#2A5A4F`, logo gold `#DDB45C`, cream `#F8F6F0`, sage `#E9F1EB`; ruby retired in PR #11); mobile CTA dock with safe-area insets (`env(safe-area-inset-bottom)`).
- ✅ Automated axe WCAG 2.2 AA checks pass on every route at 1440 and 390px (automated checks are not a full accessibility audit); `/approvals-guide` `.approvals-card .text-link` contrast failure fixed.
- ✅ Unsubstantiated NSW Fair Trading, HBCF insurance and licensing claims removed. The contractor licence now shown site-wide (501094C, Milestone Construction and Development Pty Ltd, ACN 697 166 715) was checked against the NSW public register on 2026-10-12 (`site_constants.py`). This is not a legal review.
- ✅ `/bathroom-renovation-cost` shows indicative Sydney AUD ranges built from published 2026 guides, with sources, assumptions and a disclaimer (`docs/PRICING-METHODOLOGY.md`). 🟡 They are market benchmarks, not approved Milestone rates.
- ✅ Truthful git-derived `<lastmod>` timestamps in `sitemap.xml` referencing exact file changes; canonical URLs verified 100% matching.
- ✅ Schema.org JSON-LD enhanced with verified `HomeAndConstructionBusiness`, `FAQPage` (homepage), and `Service` entities (service pages) without unverified claims or ranking promises.
- ✅ `POST /api/enquiries` — validation, honeypot/timing, rate limit, idempotency, de-dupe, durable storage, safe errors.
- ✅ Supabase migration: enquiries, notes, status history, reporting view, constraints, indexes, RLS.
- ✅ Secret audit: zero secrets committed to git; deployment documentation credential hygiene verified.
- ✅ Host redirect: `www.milestonerenovate.com` → `milestonerenovate.com` returns 308 (verified 2026-10-13).
- ✅ Staff email via Resend: domain verified; every production notification to date shows `delivered` (checked 2026-10-13). Daily retry cron deployed.

## Phase 2 — Service Content & Interactive Experiences
- ✅ `/kitchen-renovations`: Expanded with bespoke architectural layout zoning, 3-phase induction capacity, joinery durability, and Sydney heritage terrace/bungalow context.
- ✅ `/bathroom-renovations`: Expanded with AS 3740 waterproofing standards, screed drainage falls, acoustic waste lagging, custom stone vanities, and compact footprint optimization.
- ✅ `/home-renovations`: Expanded with holistic structural load-path reviews, thermal envelope upgrades, acoustic batts, and heritage preservation balancing.
- ✅ `/extensions`: Expanded with ground-floor pavilion living, second-storey master suites, NSW Housing SEPP (CDC) vs Council DA planning rules, and on-site stormwater detention (OSD).
- ✅ Cross-linking web established between services, Design Studio, Approvals Guide, Cost Planner, Quote Audit, 15-Minute Strategy Booking, and Planning Questionnaire.
- ✅ `/plan-your-renovation`: 9-step mobile-first questionnaire, contextual scope options, progress, validation, optional steps, consent.
- ✅ `/bathroom-renovation-cost`: Scope-driven planning guide + hand-off into the questionnaire.
- ✅ `/booking`: 15-minute strategy-call request with accessible pill slots (a request, not a confirmed calendar booking).
- ✅ `/quote-audit`: Builder quote and scope audit with estimator checks for omitted allowances.
- ✅ `/approvals-guide`: NSW Council DA vs CDC approvals checker with exempt development trade coordination.
- ✅ `/renovation-design-studio`: Interactive style selector with 6 AI-generated bathroom style concepts and moodboard hand-off.

## Phase 3 — SEO & Performance
- ✅ Titles/descriptions, canonicals, OG/Twitter, JSON-LD, sitemap with git lastmod, robots.txt, 404 noindex.
- ✅ 22 generated pages (21 in the sitemap + 404) return 200 in production with no console errors; every referenced asset loads.
- ✅ No horizontal overflow at 320, 375, 390, 430, 768, 1024, 1440 and 1920px on any route (production, 2026-10-13).
- ✅ Unit, Playwright and production-check results, Lighthouse runs and `npm audit`: see `STATUS.md`.

## Phase 4 — External verification (status 2026-10-13)
1. ✅ **NSW contractor licence**: 501094C (Builder) for Milestone Construction and Development Pty Ltd, register link in the footer *(verified 2026-10-12 per `site_constants.py`; not re-checked)*.
2. ✅ **www → apex redirect** (308).
3. ✅ **Resend sending domain** verified.
4. 🟡 **Resend API key rotation**: deferred by the owner (2026-10-13); the current key stays in use until then. The key whose value passed through a session transcript is still the only site key. See `DEPLOYMENT.md`.
5. 🔴 **Preview deployments use production secrets**: previews write to the production database and email staff. Decide whether to give Preview its own Supabase project/Resend key or remove those variables from Preview.
6. 🟡 **Approved rate card**: needed before calculator ranges can be presented as Milestone pricing.
7. 🟡 **Real project photography**: all imagery is labelled AI concept art.
8. 🟡 **Search Console**: register the property and submit `sitemap.xml` (not verified).
