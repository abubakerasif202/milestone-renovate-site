-- Staff-notification outbox: makes email delivery observable and retryable.
-- Purely additive: existing rows and the existing API keep working. Apply BEFORE deploying the code that uses it.
--
-- State machine (enquiries.notification_status):
--   pending  -> sent       first or later attempt succeeded
--   pending  -> failed     attempt failed; notification_next_attempt_at says when the retry job tries again
--   failed   -> sent       a retry succeeded
--   failed   -> failed     attempts exhausted (notification_attempts = 8, next_attempt_at is null): needs a human
--   pending  -> skipped    no email provider configured (never retried)
-- notification_claimed_at is a short lease so overlapping retry runs do not pick up the same row.

alter table public.enquiries
  add column notification_attempts        integer not null default 0 check (notification_attempts >= 0),
  add column notification_last_error      text check (notification_last_error is null or char_length(notification_last_error) <= 100),
  add column notification_next_attempt_at timestamptz,
  add column notification_claimed_at      timestamptz;

create index enquiries_notification_due_idx
  on public.enquiries (created_at)
  where notification_status in ('pending', 'failed');

-- At-a-glance health for staff / monitoring (service role only; invoker rights so RLS still applies).
create view public.enquiry_notification_health with (security_invoker = true) as
  select notification_status,
         count(*)                                        as enquiries,
         count(*) filter (where notification_attempts >= 8) as exhausted,
         min(created_at)                                 as oldest
  from public.enquiries
  group by notification_status;

revoke all on public.enquiry_notification_health from anon, authenticated;
grant select on public.enquiry_notification_health to service_role;

-- To re-arm a notification that exhausted its attempts (after fixing the cause, e.g. a rotated Resend key):
--   update public.enquiries set notification_attempts = 0, notification_next_attempt_at = null
--   where notification_status = 'failed' and notification_attempts >= 8;
