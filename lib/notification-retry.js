import { log } from './log.js';

export const MAX_NOTIFY_ATTEMPTS = 8;
export const NOTIFY_TIMEOUT_MS = 4000;
/** A claimed row is considered abandoned (worker died) after this long. */
export const LEASE_MS = 5 * 60_000;
/** A row still `pending` this long after creation lost its inline attempt (process died). */
export const PENDING_GRACE_MS = 2 * 60_000;
const BACKOFF_BASE_MS = 5 * 60_000;
const BACKOFF_CAP_MS = 6 * 60 * 60_000;

/** Delay before the next attempt, given how many attempts have already been made (5m, 15m, 45m, 2h15m, then 6h). */
export function nextAttemptDelayMs(attempts) {
  return Math.min(BACKOFF_BASE_MS * 3 ** Math.max(0, attempts - 1), BACKOFF_CAP_MS);
}

/** Rebuild the notifier payload from a stored enquiries row (so retries never depend on request memory). */
export function rowToEnquiry(row) {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    suburb: row.suburb ?? undefined,
    postcode: row.postcode ?? undefined,
    category: row.category,
    budgetRange: row.budget_range ?? undefined,
    timeline: row.timeline ?? undefined,
    details: row.details ?? undefined,
    source: row.source,
    wizard: row.wizard_data ?? undefined,
  };
}

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'notify_timeout' })), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const isTimeout = (error) => error?.name === 'TimeoutError' || error?.name === 'AbortError';
const errorCode = (error) => String(error?.code ?? (isTimeout(error) ? 'notify_timeout' : 'notify_error')).slice(0, 100);

/**
 * Attempt one staff notification and record the outcome on the row.
 * `attempts` is the number of attempts including this one.
 * Returns 'sent' | 'failed' | 'exhausted' | 'skipped'. Never throws.
 */
export async function attemptNotification({ store, notifier, row, enquiry, attempts, now }) {
  if (!notifier?.enabled) {
    await safeMark(store, row, 'skipped', { attempts, now });
    return 'skipped';
  }
  try {
    await withTimeout(notifier.sendStaffNotification({ reference: row.reference, enquiry }), NOTIFY_TIMEOUT_MS);
  } catch (error) {
    const exhausted = attempts >= MAX_NOTIFY_ATTEMPTS;
    const code = errorCode(error);
    await safeMark(store, row, 'failed', {
      attempts, now, error: code,
      nextAttemptAt: exhausted ? null : new Date(now.getTime() + nextAttemptDelayMs(attempts)),
    });
    log(exhausted ? 'error' : 'warn', { event: exhausted ? 'enquiry.notify_exhausted' : 'enquiry.notify_failed', reference: row.reference, code, attempt: attempts, channel: 'email' });
    return exhausted ? 'exhausted' : 'failed';
  }
  await safeMark(store, row, 'sent', { attempts, now });
  log('info', { event: 'enquiry.notified', reference: row.reference, attempt: attempts, channel: 'email' });
  return 'sent';
}

async function safeMark(store, row, status, meta) {
  try {
    await store.markNotification(row.id, status, meta);
  } catch {
    log('error', { event: 'enquiry.mark_failed', reference: row.reference, status });
  }
}

/**
 * Re-send staff notifications that failed or were never recorded.
 * Safe to run concurrently: rows are claimed with a lease, and the Resend Idempotency-Key
 * prevents a duplicate email even if two workers race.
 */
export async function retryDueNotifications({ store, notifier, now = new Date(), limit = 10 }) {
  const result = { claimed: 0, sent: 0, failed: 0, exhausted: 0, skipped: 0 };
  // A deployment missing a Resend variable must leave due rows alone, not mark real leads `skipped` forever.
  if (!notifier?.enabled) {
    log('error', { event: 'notify.retry_disabled', code: 'notifier_not_configured' });
    return result;
  }
  const rows = await store.claimDueNotifications({ now, limit, leaseMs: LEASE_MS, pendingGraceMs: PENDING_GRACE_MS, maxAttempts: MAX_NOTIFY_ATTEMPTS });
  result.claimed = rows.length;
  for (const row of rows) {
    const outcome = await attemptNotification({ store, notifier, row, enquiry: rowToEnquiry(row), attempts: (row.notification_attempts ?? 0) + 1, now });
    result[outcome] += 1;
  }
  return result;
}
