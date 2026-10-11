import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseStore } from '../lib/supabase-store.js';

// Drives the real supabase-js client against a fake PostgREST (global fetch) and inspects the requests it emits.
function fakePostgrest(handlers) {
  const requests = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = init.method ?? 'GET';
    requests.push({ method, url, search: decodeURIComponent(url.search), body: init.body ? JSON.parse(init.body) : null, hasSignal: Boolean(init.signal) });
    const { status = 200, body = [] } = handlers.shift()?.(requests.at(-1)) ?? {};
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { requests, restore: () => { globalThis.fetch = original; } };
}
const store = () => createSupabaseStore({ url: 'https://example.supabase.co', serviceRoleKey: 'test-key' });
const T = new Date('2026-10-11T02:00:00Z');
const args = { now: T, limit: 2, leaseMs: 300_000, pendingGraceMs: 120_000, maxAttempts: 8 };

test('claim SELECT filters on status, attempts, retry time and lease; every call carries a timeout signal', async () => {
  const fake = fakePostgrest([() => ({ body: [] })]);
  try {
    assert.deepEqual(await store().claimDueNotifications(args), []);
    const q = fake.requests[0].search;
    assert.match(q, /notification_status=in\.\(pending,failed\)/);
    assert.match(q, /notification_attempts=lt\.8/);
    assert.match(q, /or=\(notification_next_attempt_at\.is\.null,notification_next_attempt_at\.lte\.2026-10-11T02:00:00\.000Z\)/);
    assert.match(q, /or=\(notification_claimed_at\.is\.null,notification_claimed_at\.lte\.2026-10-11T01:55:00\.000Z\)/);
    assert.equal(fake.requests[0].hasSignal, true);
  } finally { fake.restore(); }
});

test('claim UPDATE is conditional on id, attempt count, status and lease, and only rows it actually won are returned', async () => {
  const cand = (id, status = 'failed') => ({ id, notification_status: status, notification_attempts: 1, created_at: '2026-10-11T00:00:00Z' });
  const fake = fakePostgrest([
    () => ({ body: [cand('a'), cand('b')] }),
    () => ({ body: [{ id: 'a', reference: 'MR-AAAA2222' }] }), // won
    () => ({ body: [] }), // lost the race for b
  ]);
  try {
    const rows = await store().claimDueNotifications(args);
    assert.deepEqual(rows.map((r) => r.id), ['a']);
    const update = fake.requests[1];
    assert.equal(update.method, 'PATCH');
    assert.match(update.search, /id=eq\.a/);
    assert.match(update.search, /notification_attempts=eq\.1/);
    assert.match(update.search, /notification_status=in\.\(pending,failed\)/);
    assert.match(update.search, /notification_claimed_at\.lte\.2026-10-11T01:55:00\.000Z/);
    assert.deepEqual(Object.keys(update.body), ['notification_claimed_at']);
  } finally { fake.restore(); }
});

test('a database error while claiming one row keeps the rows already claimed', async () => {
  const cand = (id) => ({ id, notification_status: 'failed', notification_attempts: 0, created_at: '2026-10-11T00:00:00Z' });
  const fake = fakePostgrest([() => ({ body: [cand('a'), cand('b')] }), () => ({ body: [{ id: 'a' }] }), () => ({ status: 500, body: { code: 'XX000', message: 'boom' } })]);
  try {
    assert.deepEqual((await store().claimDueNotifications({ ...args, limit: 5 })).map((r) => r.id), ['a']);
  } finally { fake.restore(); }
});

test('markNotification writes status, attempts, error code and retry time, and clears the lease', async () => {
  const fake = fakePostgrest([() => ({ status: 204, body: null })]);
  try {
    await store().markNotification('abc', 'failed', { attempts: 2, error: 'resend_500', nextAttemptAt: new Date('2026-10-11T02:15:00Z') });
    const { body, method } = fake.requests[0];
    assert.equal(method, 'PATCH');
    assert.deepEqual(body, { notification_status: 'failed', notification_claimed_at: null, notification_last_error: 'resend_500', notification_next_attempt_at: '2026-10-11T02:15:00.000Z', notification_attempts: 2 });
  } finally { fake.restore(); }
});
