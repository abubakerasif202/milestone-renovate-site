# Deployment & integration runbook

Last independently re-verified **2026-10-13** (read-only: no enquiries created, no email sent, no data or settings changed).
Lines marked *(earlier report)* come from previous sessions and were not re-tested on that date. Evidence: `docs/STATUS.md`.

## Vercel (dedicated project — not the parent's)
- Project `milestone-renovate-site` (team `abubakerasif202's projects`), Git-connected to `abubakerasif202/milestone-renovate-site`, production branch `main`.
- Output directory `public`; functions run in `syd1` (confirmed from `x-vercel-id`).
- Domains: `milestonerenovate.com` serves production publicly; `www.milestonerenovate.com` answers `308` to the apex (verified 2026-10-13).
  Deployment Protection (Vercel Authentication) applies to `*.vercel.app` preview URLs, not the custom domains *(earlier report: setting `all_except_custom_domains`)*.
- Production on 2026-10-13: deployment `dpl_6Hn3UKrbTQ1gP7H8tkG4B9Me3Xv3`, Ready, built from `main` @ `76bdba2` (PR #11 merge).
- Edge abuse protection: firewall rule "Rate limit enquiry API" — 8 POSTs/min per IP to `/api/enquiries`, then deny for 5 minutes,
  counting valid, invalid and rejected requests *(earlier report; not re-tested, because testing it needs POSTs)*.
- `*.vercel.app` hosts send `X-Robots-Tag: noindex, nofollow`.
- Commit author must be linked to a GitHub account on the Vercel team (noreply address is configured for this repo).

## Environment variables (names checked 2026-10-13 with `vercel env ls`; values not read)
- **Production:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SECRET`, `RESEND_API_KEY`, `NOTIFY_TO_EMAIL`, `NOTIFY_FROM_EMAIL`,
  `ALLOWED_ORIGINS`, `CRON_SECRET` — all type Secret. `CRON_SECRET` was added 2026-10-11; the others 2026-10-10.
- **Preview:** the same set except `CRON_SECRET`. **Preview therefore uses the production Supabase service-role key and the production
  Resend key:** an enquiry submitted on any preview deployment is stored in the production database and emails staff. See STATUS.md, open items.
Values are never committed or logged. `.env*` is git-ignored except `.env.example`.

## Supabase (dedicated Milestone Renovate project, ap-southeast-2)
- Project in `ap-southeast-2` (Sydney), Postgres 17, status ACTIVE_HEALTHY (2026-10-13).
- Applied migrations (as recorded by Supabase): `20261010050658 enquiries` and `20261011053951 notification_outbox`. They correspond to the
  repo files `20261010000000_enquiries.sql` and `20261011000000_notification_outbox.sql`; the version numbers differ because they were
  applied through the dashboard/MCP, which stamps its own timestamp. Apply new migrations the same way and note the mapping here.
- Tables `enquiries`, `enquiry_notes`, `enquiry_status_events`; views `enquiry_pipeline_summary`, `enquiry_notification_health`.
- RLS enabled on all three tables (forced on `enquiries`) with **no policies**; `anon` and `authenticated` hold no table privileges on any
  table or view (checked with `has_table_privilege`, 2026-10-13). Only `service_role` can read/write.
- Security advisor (2026-10-13): only the three INFO notices "RLS enabled, no policy", which is the intended deny-all design.
- *(Earlier report)* Over the real REST API with the public key every read, insert and update returned `42501`; rows store with consent
  timestamp/version and hashed IP (never raw); the status-history trigger fires; idempotent retries return the original reference; bad
  payloads return 422 without creating rows.

## Resend
- Domain `milestonerenovate.com` is verified (sending enabled, ap-northeast-1). Staff emails go to `NOTIFY_TO_EMAIL`, from `enquiries@milestonerenovate.com`, with `reply_to` set to the enquirer.
- Domain verified, sending enabled, region `ap-northeast-1`, open/click tracking off (checked 2026-10-13).
- A sending-only API key restricted to this domain was created for the site. **Its value passed through an AI session transcript when it was created.**
  **Status 2026-10-13: not rotated — deferred by the owner; keep using the current key until they rotate it.** The account holds one site key, "milestone-renovate-site-vercel (send only)", created 2026-10-10 05:09 UTC,
  and the Vercel `RESEND_API_KEY` variables were created the same day. Rotate: Resend → API keys → create a new send-only key for
  `milestonerenovate.com` → update `RESEND_API_KEY` in Vercel Production **and** Preview → redeploy → delete the old key.
  (A second key, "Supabase Integration", created 2026-10-10 10:05 UTC, is not used by the site; confirm whether it is still needed.)
- Delivery: all six notification emails in the account (2026-10-10 to 2026-10-12) show `delivered` (checked 2026-10-13).

## Re-running the live pipeline check
`INTEGRATION=1 DEPLOYED_URL=https://<alias> npx playwright test tests/e2e/integration.spec.js` creates labelled test leads and sends real staff emails.
Delete them afterwards: `delete from public.enquiries where name like 'ZZ TEST - %';`

## Staff-notification outbox and retry (deployed)
A stored enquiry is the source of truth; the staff email is delivered at-least-once from the `enquiries` row itself.

**Deploy order (for a fresh environment; completed for production on 2026-10-11):**
1. Apply `supabase/migrations/20261011000000_notification_outbox.sql` (additive; no existing column changes).
2. Add `CRON_SECRET` (16+ random characters) to Vercel **Production** (and Preview if previews should run the job). Without it `/api/notifications/retry` answers 503 and does nothing.
3. Merge/deploy. `vercel.json` (generated by `build_site.py`) registers a daily Vercel Cron `0 20 * * *` UTC (~6–7am Sydney). Daily is the most frequent schedule valid on every Vercel plan; on Pro, change the schedule in `build_site.py` (e.g. `*/15 * * * *`).

**States** (`enquiries.notification_status`): `pending` → `sent` | `failed` | `skipped`.
- First attempt happens inline on submission; a failure records `notification_attempts`, `notification_last_error` (a code, never personal data) and `notification_next_attempt_at`.
- Retries back off 5 min, 15 min, 45 min, ~2h15, then 6h, up to 8 attempts. After the 8th the row stays `failed` with `notification_next_attempt_at` null — that is the "needs a human" state (also logged as `enquiry.notify_exhausted`).
- A row left `pending` (function died after insert) is picked up 2 minutes after creation.
- Overlapping runs cannot double-send: rows are claimed with a 5-minute lease and the Resend `Idempotency-Key` (`enquiry-notify/<reference>`, 24h) makes a repeat call a no-op.
- `skipped` (email not configured) is never retried.

**Monitor:** `select * from public.enquiry_notification_health;` (service role). Re-arm exhausted rows after fixing the cause:
`update public.enquiries set notification_attempts = 0, notification_next_attempt_at = null where notification_status = 'failed' and notification_attempts >= 8;`

**Before first run:** `select reference, notification_status, created_at from public.enquiries where notification_status in ('pending','failed');` — any such existing rows (e.g. old test leads) will be emailed on the first run; delete or set them to `skipped` first if that is not wanted.

**Verified 2026-10-13:** `vercel crons ls` lists `/api/notifications/retry` at `0 20 * * *`. The last scheduled run in the logs is
2026-10-11 20:00 UTC (`notify.retry_run claimed=0 sent=0 failed=0 exhausted=0`); the next was due 2026-10-12 20:00 UTC, after this check.
`enquiry_notification_health`: 2 enquiries, both `sent`, none exhausted. Unauthenticated `GET /api/notifications/retry` returns 401.

**Runtime:** Node is pinned to `24.x` in `package.json` (`engines`), `.nvmrc`, and the Vercel project setting (verified 24.x).
