# Implementation roadmap

Status key: ✅ done & tested locally · 🟡 built, needs external config/verification · ⬜ planned

## Phase 1 — Production-ready foundation
- ✅ Approved gold logo in header, footer, favicons, Apple touch icon, OG/Twitter image (local assets)
- ✅ Brand palette (forest `#073E2B`, gold `#DDB45C`, cream `#F8F6F0`); gold-on-cream contrast issue fixed by using a forest header
- ✅ Homepage proposition, CTAs "Plan Your Renovation" / "Speak To Our Team", short-contact option (phone + contact form)
- ✅ `POST /api/enquiries` — validation, honeypot/timing, rate limit, idempotency, de-dupe, durable storage, safe errors
- ✅ Supabase migration: enquiries, notes, status history, reporting view, constraints, indexes, RLS
- 🟡 Staff email via Resend (code + tests done; needs `RESEND_API_KEY`, verified sender domain, recipients)
- 🟡 Supabase project: migration not yet applied to a real project; needs URL + service-role key
- ✅ Privacy notice rewritten for the real data flow (draft — needs legal/entity review)

## Phase 2 — Conversion
- ✅ `/plan-your-renovation`: 9-step mobile-first questionnaire, contextual scope options, progress, validation, optional steps, consent
- ✅ `/bathroom-renovation-cost`: planning guide (no prices) + hand-off into the questionnaire
- ✅ Calculator module with configurable rate card and tests
- ⬜ Replace placeholder service-page copy with original, approved content (kitchens, bathrooms, extensions, whole-home)

## Phase 3 — SEO
- ✅ Titles/descriptions, canonicals, OG/Twitter, JSON-LD (WebSite, Organization, WebPage, BreadcrumbList), sitemap with lastmod, robots, 404 noindex
- ⬜ Informational pages (original content, not copied from Milestone Development): renovation planning checklist, how to read a renovation budget, approvals (council/strata) explainer, renovation process timeline
- ⬜ Location pages **only** for verified service areas, each with genuinely local original content. No mass-generated pages.
- ⬜ Lighthouse / Core Web Vitals run on a deployed preview; convert hero imagery to responsive `srcset` once local images exist
- ⬜ Duplicate-content check against milestonedevelopment.com.au before publishing any shared copy

## Phase 4 — Later (documented, not started)
- ⬜ Approved rate card → enable priced ranges in the planner (needs commercial sign-off on every rate)
- ⬜ Consultation calendar / booking
- ⬜ Protected admin dashboard (Supabase Auth + explicit admin RLS policies; the schema is ready for it)
- ⬜ Client portal
- ⬜ AI moodboard generator
- ⬜ Trade-partner workflows
- ⬜ Secure file upload (private bucket, type/size limits, malware scan) — omitted until then

## Business facts requiring verification before launch
1. Legal trading entity for Milestone Renovate (privacy notice, footer, future terms)
2. Permission to use Milestone Development's phone `1800 008 883` and `admin@milestonedevelopment.com.au` for this brand
3. Verified service areas (copy currently says "Sydney / NSW", inherited from the starter)
4. Rights to use the parent project's photography (currently illustrative concept images) and whether to commission owned imagery
5. Whether any staff profile may appear (the starter's James Creswick "Renovation Expert" profile was **removed** pending approval)
6. Licensing, insurance, HIA/MBA membership, warranties — none are claimed; add only with evidence
7. Retention period for enquiry data; who has access to Supabase and the notification inbox
8. Domain ownership for `milestonerenovate.com` and an email sender domain for Resend

## Security follow-ups
- **Rotate the Firecrawl API key** exposed in the research session (not used or copied here)
- Turn on Supabase leaked-password / MFA for staff accounts; restrict dashboard access
- Add a Vercel Firewall rate-limit rule in front of `/api/enquiries` before launch
- Run a deployed-preview DAST scan (HawkScan) once a preview URL exists
