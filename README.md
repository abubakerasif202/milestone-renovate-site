# Milestone Renovate

Premium Australian renovation website and enquiry platform for **Milestone Renovate**, sister brand of Milestone Development.
Static HTML/CSS/JS + one Vercel function + Supabase. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/IMPLEMENTATION-ROADMAP.md](docs/IMPLEMENTATION-ROADMAP.md).

> **Do not attach this repo to the Milestone Development Vercel project or repository.** Create a separate Vercel project.

## Develop

```bash
npm install
npm run dev          # http://127.0.0.1:8765 — leads go to an IN-MEMORY store (dev only, nothing persisted or emailed)
npm run build:site   # regenerate public/*.html from build_site.py
npm run build:brand  # regenerate favicons / OG image from the logo pack
```

Edit page content in `build_site.py`, then rebuild. Styles live in `public/css`, behaviour in `public/js`.

## Test

```bash
npm test             # unit + integration (service, handler, real-migration RLS on PGlite, wizard, client, planner)
npm run test:e2e     # Playwright against the dev server using installed Chrome
npm run audit        # production dependency audit
```

## Configure production (Vercel project → Environment Variables)

Copy `.env.example` for the full list. Required for enquiries to work: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`IP_HASH_SECRET`. Optional (staff emails): `RESEND_API_KEY`, `NOTIFY_TO_EMAIL`, `NOTIFY_FROM_EMAIL`.
Apply `supabase/migrations/*.sql` to the Supabase project. Without configuration the API returns `503 not_configured`
(it never pretends to save).

## Before launch
See "Business facts requiring verification" in the roadmap. Images are currently illustrative concepts, not completed projects.
