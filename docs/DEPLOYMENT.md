# Deployment & integration runbook

Status as of the latest commit. Nothing here is claimed unless it was verified; blockers are listed explicitly.

## Vercel (dedicated project — not the parent's)
- Project: `milestone-renovate-site` (team `abubakerasif202's projects`), Git-connected to `abubakerasif202/milestone-renovate-site`
- Output directory `public`, functions in `syd1`, no custom domain attached, DNS untouched
- Verified on the deployed site: clean URLs, `.html` → 308, 404 page, static assets and MIME types, CSP/HSTS/frame/nosniff/referrer/permissions headers, private files (`lib/`, `supabase/`, `package.json`, `.env.example`, tests) return 404, `GET /api/enquiries` → 405, `POST` without config → `503 not_configured` (fails closed)
- **Edge abuse protection (published):** firewall rule "Rate limit enquiry API" — 8 POSTs/min per IP to `/api/enquiries`, then deny for 1h. Counts valid, invalid and rejected requests. Verified: first 8 reach the function, the next are blocked 403 at the edge.
- Preview/`*.vercel.app` hosts send `X-Robots-Tag: noindex, nofollow`.
- **Deployment Protection (Vercel Authentication) must be enabled** in Project → Settings → Deployment Protection → "All Deployments" so the site is private until launch approval.
- The first deployment of a Vercel project is automatically the "production" target of its default `*.vercel.app` alias. Consider setting the production branch to a `release` branch so `main` pushes stay previews.
- Commit author must match a GitHub account on the Vercel team, otherwise Vercel blocks the Git deployment.

## Supabase (BLOCKED — dedicated project required)
The only project visible to the connected account (`My Project`, ap-southeast-2) belongs to a different business
(removals bookings, customers, Stripe events). **Do not apply this migration there.**
1. Create a new Supabase project dedicated to Milestone Renovate (Sydney region recommended).
2. Apply `supabase/migrations/20261010000000_enquiries.sql`.
3. Set in Vercel (Production + Preview, type *sensitive*): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SECRET` (32+ random chars).
4. Verify: insert via the live form; confirm `anon` REST requests to `/rest/v1/enquiries` return 401/403 or empty; run the Supabase security advisor.

## Resend (BLOCKED — sender domain required)
The only verified Resend domain on the connected account is unrelated to Milestone. A domain Milestone Renovate controls is needed
(e.g. `milestonerenovate.com` or a Milestone Development sending subdomain with owner approval):
1. Add the domain in Resend and publish the SPF/DKIM records at its DNS host; wait for "verified".
2. Set `RESEND_API_KEY`, `NOTIFY_TO_EMAIL`, `NOTIFY_FROM_EMAIL=Milestone Renovate <enquiries@that-domain>` in Vercel.
3. Submit a test enquiry; confirm `notification_status = 'sent'` and the staff inbox receives it.

## Environment variables
See `.env.example`. Never commit real values; `.env*` files are git-ignored (except `.env.example`).
