# Implementation roadmap

Status key: ✅ done & verified locally · 🟡 built, needs external config/verification · ⬜ planned

## Phase 1 — Production-ready foundation (Audit Fixes Verified)
- ✅ Root `favicon.ico` (16x16 and 32x32 frames packed in binary ICO) and `site.webmanifest` generated from approved brand assets.
- ✅ Approved gold logo in header, footer, favicons, Apple touch icon, OG/Twitter image (local WebP/PNG assets).
- ✅ Brand palette (forest `#073E2B`, gold `#DDB45C`, cream `#F8F6F0`); mobile CTA dock with safe-area insets (`env(safe-area-inset-bottom)`).
- ✅ WCAG 2.2 AA & AAA contrast compliance verified across all 20 routes; `/approvals-guide` `.approvals-card .text-link` contrast failure fixed.
- ✅ Statutory compliance & consumer law review complete: removed all unsubstantiated NSW Fair Trading, HBCF insurance, and licensing claims. Factual trade coordination, planning rigour, and Milestone heritage attributes established.
- ✅ Unapproved price bands ($18,000–$75,000+) removed from `/bathroom-renovation-cost`; replaced with architectural scope-based guidance while preserving unitless interactive calculator.
- ✅ Truthful git-derived `<lastmod>` timestamps in `sitemap.xml` referencing exact file changes; canonical URLs verified 100% matching.
- ✅ Schema.org JSON-LD enhanced with verified `HomeAndConstructionBusiness`, `FAQPage` (homepage), and `Service` entities (service pages) without unverified claims or ranking promises.
- ✅ `POST /api/enquiries` — validation, honeypot/timing, rate limit, idempotency, de-dupe, durable storage, safe errors.
- ✅ Supabase migration: enquiries, notes, status history, reporting view, constraints, indexes, RLS.
- ✅ Secret audit: zero secrets committed to git; deployment documentation credential hygiene verified.
- 🟡 Host redirect: `www.milestonerenovate.com` -> `milestonerenovate.com` (requires Vercel Dashboard domain redirect 308 setting).
- 🟡 Staff email via Resend (code + tests verified; needs production `RESEND_API_KEY` verification).

## Phase 2 — Service Content & Interactive Experiences
- ✅ `/kitchen-renovations`: Expanded with bespoke architectural layout zoning, 3-phase induction capacity, joinery durability, and Sydney heritage terrace/bungalow context.
- ✅ `/bathroom-renovations`: Expanded with AS 3740 waterproofing standards, screed drainage falls, acoustic waste lagging, custom stone vanities, and compact footprint optimization.
- ✅ `/home-renovations`: Expanded with holistic structural load-path reviews, thermal envelope upgrades, acoustic batts, and heritage preservation balancing.
- ✅ `/extensions`: Expanded with ground-floor pavilion living, second-storey master suites, NSW Housing SEPP (CDC) vs Council DA planning rules, and on-site stormwater detention (OSD).
- ✅ Cross-linking web established between services, Design Studio, Approvals Guide, Cost Planner, Quote Audit, 15-Minute Strategy Booking, and Planning Questionnaire.
- ✅ `/plan-your-renovation`: 9-step mobile-first questionnaire, contextual scope options, progress, validation, optional steps, consent.
- ✅ `/bathroom-renovation-cost`: Scope-driven planning guide + hand-off into the questionnaire.
- ✅ `/booking`: 15-minute consultation booking with accessible radio pill slots.
- ✅ `/quote-audit`: Builder quote and scope audit with estimator checks for omitted allowances.
- ✅ `/approvals-guide`: NSW Council DA vs CDC approvals checker with exempt development trade coordination.
- ✅ `/renovation-design-studio`: Interactive style selector with 6 photographed bathroom styles and client moodboard hand-off.

## Phase 3 — SEO & Performance
- ✅ Titles/descriptions, canonicals, OG/Twitter, JSON-LD, sitemap with git lastmod, robots.txt, 404 noindex.
- ✅ Full suite of 20 public routes responding with clean markup and zero console errors.
- ✅ Responsive testing passing across 320px, 390px, 768px, 1024px, 1440px, and 1920px viewports without horizontal overflow.
- ✅ 84 unit and integration tests passing (`npm test`).
- ✅ 120 Playwright end-to-end tests passing (`npm run test:e2e`).
- ✅ 0 npm vulnerabilities (`npm audit`).

## Phase 4 — External Verification & Launch Pre-requisites
1. **NSW Contractor Licence Confirmation**: Owner/director to confirm registered residential builder licence number and contractor entity before adding any statutory licensing badge.
2. **Vercel Custom Domain Configuration**: Set `www.milestonerenovate.com` to redirect (HTTP 308) to apex `milestonerenovate.com` in Vercel project domain settings.
3. **Resend Sender Domain**: Configure and verify DNS records for the production sending domain in Resend dashboard.
4. **Resend API Key Rotation**: Rotate the operational Resend key in the Resend dashboard and update `RESEND_API_KEY` in Vercel environment variables.
