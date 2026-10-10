# Deployment & integration runbook

Everything below was verified against the live services unless marked otherwise.

## Vercel (dedicated project — not the parent's)
- Project `milestone-renovate-site` (team `abubakerasif202's projects`), Git-connected to `abubakerasif202/milestone-renovate-site`, production branch `main`.
- Output directory `public`; functions run in `syd1` (confirmed from `x-vercel-id`).
- Domains attached to the project: `milestonerenovate.com`, `www.milestonerenovate.com` (+ the default `*.vercel.app` alias).
  **They currently serve the site publicly.** Vercel Authentication is set to `all_except_custom_domains`, which by design
  leaves custom domains open. To keep the site private until launch approval, set Deployment Protection to **All Deployments**
  (or remove the custom domains from the project).
- Edge abuse protection (published): firewall rule "Rate limit enquiry API" — 8 POSTs/min per IP to `/api/enquiries`, then deny for 5 minutes.
  It counts valid, invalid and rejected requests. Verified live.
- `*.vercel.app` hosts send `X-Robots-Tag: noindex, nofollow`.
- Commit author must be linked to a GitHub account on the Vercel team (noreply address is configured for this repo).

## Environment variables (Production + Preview, all stored as *sensitive*)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SECRET`, `RESEND_API_KEY`, `NOTIFY_TO_EMAIL`, `NOTIFY_FROM_EMAIL`, `ALLOWED_ORIGINS`.
Values are never committed or logged. `.env*` is git-ignored except `.env.example`.

## Supabase (dedicated Milestone Renovate project, ap-southeast-2)
- Migration `20261010000000_enquiries` applied. Tables `enquiries`, `enquiry_notes`, `enquiry_status_events` and view `enquiry_pipeline_summary` exist.
- RLS enabled on all tables (forced on `enquiries`) with **no policies**; `anon`/`authenticated` have no table privileges; only `service_role` can read/write.
- Verified over the real REST API with the public key: every read, insert and update returns `42501 permission denied`.
- Security advisor: only three INFO notices ("RLS enabled, no policy"), which is the intended deny-all design.
- Live checks: rows store with consent timestamp/version, hashed IP (never raw), status-history trigger fires, idempotent retries return the original reference, bad payloads return 422 without creating rows.

## Resend
- Domain `milestonerenovate.com` is verified (sending enabled, ap-northeast-1). Staff emails go to `NOTIFY_TO_EMAIL`, from `enquiries@milestonerenovate.com`, with `reply_to` set to the enquirer.
- A sending-only API key restricted to this domain was created for the site. **Its value passed through the Claude Code session transcript** when it was created; rotate it
  (Resend → API keys → create new → update `RESEND_API_KEY` in Vercel → delete the old key "milestone-renovate-site-vercel (send only)") if that transcript is shared.
- Verified: the notification for a live enquiry reached `delivered` status in Resend.

## Re-running the live pipeline check
`INTEGRATION=1 DEPLOYED_URL=https://<alias> npx playwright test tests/e2e/integration.spec.js` creates labelled test leads and sends real staff emails.
Delete them afterwards: `delete from public.enquiries where name like 'ZZ TEST - %';`
