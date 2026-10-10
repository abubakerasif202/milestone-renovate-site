import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createEnquiry } from '../lib/enquiry-service.js';
import { createMemoryStore } from '../lib/memory-store.js';
import { createResendNotifier } from '../lib/notifier.js';
import { createRetryHandler } from '../lib/notification-retry-handler.js';
import { LEASE_MS, MAX_NOTIFY_ATTEMPTS, PENDING_GRACE_MS, nextAttemptDelayMs, retryDueNotifications } from '../lib/notification-retry.js';

const T0 = new Date('2026-10-11T02:00:00Z');
const minutes = (n) => n * 60_000;
const payload = (over = {}) => ({
  idempotencyKey: randomUUID(), name: 'Jordan Citizen', phone: '0412 345 678', email: 'jordan@example.com',
  suburb: 'North Sydney', postcode: '2060', category: 'kitchen', details: 'Open up the kitchen to the living room.',
  source: 'contact-form', consent: true, formStartedAt: T0.getTime() - 20_000, ...over,
});
const flaky = (failures) => {
  const notifier = { enabled: true, calls: [], async sendStaffNotification(p) {
    notifier.calls.push(p);
    if (notifier.calls.length <= failures) throw Object.assign(new Error('boom'), { code: 'resend_500' });
  } };
  return notifier;
};
const submit = async (store, notifier, now = T0) => createEnquiry({ body: payload(), ip: '203.0.113.9' }, { store, notifier, ipSecret: 's', now: () => now });

test('a failed first notification is recorded as failed with attempts, error code and a retry time', async () => {
  const store = createMemoryStore();
  const res = await submit(store, flaky(1));
  assert.equal(res.status, 201, 'lead is stored and acknowledged even though email failed');
  const row = store.rows[0];
  assert.equal(row.notification_status, 'failed');
  assert.equal(row.notification_attempts, 1);
  assert.equal(row.notification_last_error, 'resend_500');
  assert.equal(row.notification_next_attempt_at.getTime(), T0.getTime() + nextAttemptDelayMs(1));
});

test('retry waits for the backoff window, then sends exactly once and marks sent', async () => {
  const store = createMemoryStore();
  const notifier = flaky(1);
  await submit(store, notifier);

  const early = await retryDueNotifications({ store, notifier, now: new Date(T0.getTime() + minutes(1)) });
  assert.equal(early.claimed, 0);
  assert.equal(notifier.calls.length, 1);

  const later = new Date(T0.getTime() + minutes(10));
  const done = await retryDueNotifications({ store, notifier, now: later });
  assert.deepEqual({ claimed: done.claimed, sent: done.sent, failed: done.failed }, { claimed: 1, sent: 1, failed: 0 });
  assert.equal(store.rows[0].notification_status, 'sent');
  assert.equal(store.rows[0].notification_attempts, 2);
  assert.equal(notifier.calls[1].enquiry.email, 'jordan@example.com', 'retry rebuilds the payload from the stored row');
  assert.equal(notifier.calls[1].reference, store.rows[0].reference);

  const again = await retryDueNotifications({ store, notifier, now: new Date(later.getTime() + minutes(60)) });
  assert.equal(again.claimed, 0, 'a sent notification is never re-sent');
  assert.equal(notifier.calls.length, 2);
});

test('backoff grows and attempts stop at the maximum, leaving an observable exhausted failure', async () => {
  assert.ok(nextAttemptDelayMs(2) > nextAttemptDelayMs(1));
  assert.ok(nextAttemptDelayMs(50) <= 6 * 60 * 60_000);
  const store = createMemoryStore();
  const notifier = flaky(Infinity);
  await submit(store, notifier);
  let clock = T0.getTime();
  let lastResult;
  for (let i = 0; i < MAX_NOTIFY_ATTEMPTS + 3; i += 1) {
    clock += 7 * 60 * 60_000;
    lastResult = await retryDueNotifications({ store, notifier, now: new Date(clock) });
  }
  assert.equal(store.rows[0].notification_attempts, MAX_NOTIFY_ATTEMPTS);
  assert.equal(store.rows[0].notification_status, 'failed');
  assert.equal(store.rows[0].notification_next_attempt_at, null);
  assert.equal(lastResult.claimed, 0);
  assert.equal(notifier.calls.length, MAX_NOTIFY_ATTEMPTS);
});

test('two overlapping workers cannot both claim the same notification', async () => {
  const store = createMemoryStore();
  const notifier = flaky(1);
  await submit(store, notifier);
  const now = new Date(T0.getTime() + minutes(10));
  const [a, b] = await Promise.all([
    retryDueNotifications({ store, notifier, now }),
    retryDueNotifications({ store, notifier, now }),
  ]);
  assert.equal(a.claimed + b.claimed, 1);
  assert.equal(notifier.calls.length, 2, 'initial failure + exactly one retry');
});

test('a row stuck in pending (process died after insert) is picked up after the grace period only', async () => {
  const store = createMemoryStore();
  const notifier = { enabled: true, calls: [], async sendStaffNotification(p) { this.calls.push(p); } };
  const created = await store.insertEnquiry({
    idempotency_key: randomUUID(), dedupe_hash: 'h', reference: 'MR-ABCD2345', category: 'bathroom', name: 'Sam Smith',
    phone: '0298765432', email: 'sam@example.com', suburb: null, postcode: '2060', budget_range: null, timeline: null,
    details: 'Walk-in shower', wizard_data: null, source: 'contact-form', source_page: '/contact',
    consent_at: T0.toISOString(), consent_version: 'v', ip_hash: null,
  });
  store.rows[0].created_at = T0;
  assert.equal(created.ok, true);
  assert.equal((await retryDueNotifications({ store, notifier, now: new Date(T0.getTime() + 30_000) })).claimed, 0, 'inline attempt may still be in flight');
  assert.equal((await retryDueNotifications({ store, notifier, now: new Date(T0.getTime() + minutes(5)) })).sent, 1);
  assert.equal(store.rows[0].notification_status, 'sent');
});

test('a claim whose worker died is released after the lease expires', async () => {
  const store = createMemoryStore();
  const notifier = flaky(1);
  await submit(store, notifier);
  const t1 = new Date(T0.getTime() + minutes(10));
  const [claimed] = await store.claimDueNotifications({ now: t1, limit: 5, leaseMs: LEASE_MS, pendingGraceMs: PENDING_GRACE_MS, maxAttempts: MAX_NOTIFY_ATTEMPTS });
  assert.ok(claimed, 'first worker claims then dies');
  assert.equal((await retryDueNotifications({ store, notifier, now: new Date(t1.getTime() + minutes(1)) })).claimed, 0);
  assert.equal((await retryDueNotifications({ store, notifier, now: new Date(t1.getTime() + minutes(10)) })).sent, 1);
});

test('skipped notifications (no email configured) are not retried', async () => {
  const store = createMemoryStore();
  await submit(store, { enabled: false });
  assert.equal(store.rows[0].notification_status, 'skipped');
  const r = await retryDueNotifications({ store, notifier: { enabled: false }, now: new Date(T0.getTime() + minutes(600)) });
  assert.equal(r.claimed, 0);
});

test('a retry run with the email provider unconfigured leaves due rows untouched (never marks real leads skipped)', async () => {
  const store = createMemoryStore();
  await submit(store, flaky(1));
  const r = await retryDueNotifications({ store, notifier: { enabled: false }, now: new Date(T0.getTime() + minutes(600)) });
  assert.equal(r.claimed, 0);
  assert.equal(store.rows[0].notification_status, 'failed');
  assert.equal(store.rows[0].notification_attempts, 1);
});

test('the Resend notifier sends a stable Idempotency-Key per enquiry reference and aborts on a timeout signal', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push(init); return { ok: true, status: 200 }; };
  const notifier = createResendNotifier({ apiKey: 'k', to: 'a@b.co', from: 'x@y.co', fetchImpl });
  const enquiry = { name: 'A', phone: '1', email: 'a@b.co', category: 'kitchen', source: 'wizard' };
  await notifier.sendStaffNotification({ reference: 'MR-ABCD2345', enquiry });
  await notifier.sendStaffNotification({ reference: 'MR-ABCD2345', enquiry });
  assert.equal(seen[0].headers['Idempotency-Key'], seen[1].headers['Idempotency-Key']);
  assert.match(seen[0].headers['Idempotency-Key'], /MR-ABCD2345/);
  assert.ok(seen[0].signal instanceof AbortSignal);
});

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}

test('retry endpoint fails closed without a configured secret and rejects wrong or missing bearer tokens', async () => {
  const deps = { store: createMemoryStore(), notifier: { enabled: true, async sendStaffNotification() {} } };
  await withServer(createRetryHandler(() => deps, () => undefined), async (base) => {
    assert.equal((await fetch(`${base}/api/notifications/retry`, { headers: { authorization: 'Bearer anything' } })).status, 503);
  });
  await withServer(createRetryHandler(() => deps, () => 'topsecret-topsecret'), async (base) => {
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { authorization: 'Bearer wrong' } })).status, 401);
    assert.equal((await fetch(base, { method: 'PUT', headers: { authorization: 'Bearer topsecret-topsecret' } })).status, 405);
    const ok = await fetch(base, { headers: { authorization: 'Bearer topsecret-topsecret' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(await ok.json()).sort(), ['claimed', 'exhausted', 'failed', 'ok', 'sent', 'skipped']);
  });
});
