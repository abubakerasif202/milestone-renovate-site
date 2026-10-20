import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createEnquiry, RATE_LIMIT } from '../lib/enquiry-service.js';
import { createMemoryStore } from '../lib/memory-store.js';

const NOW = new Date('2026-10-10T02:00:00Z');
const base = (over = {}) => ({
  idempotencyKey: randomUUID(),
  name: 'Jordan Citizen',
  phone: '0412 345 678',
  email: 'Jordan@Example.com',
  suburb: 'North Sydney',
  postcode: '2060',
  category: 'kitchen',
  budgetRange: '100k_250k',
  timeline: '3_6_months',
  details: 'Open up the kitchen to the living room and replace cabinetry.',
  source: 'contact-form',
  sourcePage: '/contact',
  consent: true,
  formStartedAt: NOW.getTime() - 20_000,
  ...over,
});
const okNotifier = () => ({ enabled: true, calls: [], async sendStaffNotification(p) { this.calls.push(p); } });
const deps = (over = {}) => ({ store: createMemoryStore(), notifier: okNotifier(), ipSecret: 'test-secret', now: () => NOW, ...over });
const submit = (body, d, ip = '203.0.113.9') => createEnquiry({ body, ip }, d);

test('stores a valid enquiry and returns a reference only after persistence', async () => {
  const d = deps();
  const res = await submit(base(), d);
  assert.equal(res.status, 201);
  assert.match(res.body.reference, /^MR-[A-Z2-9]{8}$/);
  assert.equal(d.store.rows.length, 1);
  const row = d.store.rows[0];
  assert.equal(row.reference, res.body.reference);
  assert.equal(row.email, 'jordan@example.com');
  assert.equal(row.phone, '0412345678');
  assert.equal(row.consent_at, NOW.toISOString());
  assert.notEqual(row.ip_hash, '203.0.113.9');
  assert.equal(d.store.rows[0].notification_status, 'sent');
});

test('rejects invalid input with per-field messages and stores nothing', async () => {
  const d = deps();
  const res = await submit(base({ email: 'nope', phone: '12', postcode: '12', category: 'pool', consent: false }), d);
  assert.equal(res.status, 422);
  assert.deepEqual(Object.keys(res.body.fields).sort(), ['category', 'consent', 'email', 'phone', 'postcode']);
  assert.equal(d.store.rows.length, 0);
});

test('requires suburb or postcode, and details for the contact form', async () => {
  const d = deps();
  const noLoc = await submit(base({ suburb: '', postcode: '' }), d);
  assert.equal(noLoc.status, 422);
  assert.ok(noLoc.body.fields.postcode);
  const noDetails = await submit(base({ details: 'short' }), d);
  assert.ok(noDetails.body.fields.details);
});

test('wizard submissions may omit details but need questionnaire answers', async () => {
  const d = deps();
  const ok = await submit(base({ source: 'wizard', details: undefined, wizard: { propertyType: 'house', scope: ['new_cabinetry'], finishLevel: 'mid_range' } }), d);
  assert.equal(ok.status, 201);
  assert.deepEqual(d.store.rows[0].wizard_data.scope, ['new_cabinetry']);
  const bad = await submit(base({ source: 'wizard', details: undefined }), d);
  assert.equal(bad.status, 422);
});

test('rejects unknown fields (strict schema)', async () => {
  const res = await submit(base({ role: 'admin' }), deps());
  assert.equal(res.status, 422);
});

test('rejects honeypot and too-fast submissions', async () => {
  const d = deps();
  assert.equal((await submit({ ...base(), website: 'http://spam.example' }, d)).status, 400);
  assert.equal((await submit(base({ formStartedAt: NOW.getTime() - 300 }), d)).status, 400);
  assert.equal(d.store.rows.length, 0);
});

test('rate limits repeated submissions from one IP', async () => {
  const d = deps();
  for (let i = 0; i < RATE_LIMIT.max; i += 1) {
    const res = await submit(base({ details: `Unique project ${i} with enough detail`, email: `p${i}@example.com` }), d);
    assert.equal(res.status, 201);
  }
  const blocked = await submit(base({ details: 'One more distinct project here', email: 'x@example.com' }), d);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers['Retry-After']);
  const otherIp = await submit(base({ details: 'Another distinct project here', email: 'y@example.com' }), d, '198.51.100.7');
  assert.equal(otherIp.status, 201);
});

test('same idempotency key returns the original reference without a second row', async () => {
  const d = deps();
  const payload = base();
  const first = await submit(payload, d);
  const retry = await submit(payload, d);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.duplicate, true);
  assert.equal(retry.body.reference, first.body.reference);
  assert.equal(d.store.rows.length, 1);
  assert.equal(d.notifier.calls.length, 1);
});

test('identical content with a new key is de-duplicated inside the window', async () => {
  const d = deps();
  const first = await submit(base(), d);
  const again = await submit(base({ idempotencyKey: randomUUID() }), d);
  assert.equal(again.body.reference, first.body.reference);
  assert.equal(d.store.rows.length, 1);
});

test('storage failure is never reported as success and is retryable', async () => {
  const d = deps({ store: createMemoryStore({ failInsert: true }) });
  const res = await submit(base(), d);
  assert.equal(res.status, 503);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.retryable, true);
  assert.equal(res.body.reference, undefined);
  assert.equal(d.notifier.calls.length, 0);
  // retry with the same key succeeds once storage recovers
  d.store.setFailInsert(false);
  const payload = base();
  const retry = await submit(payload, d);
  assert.equal(retry.status, 201);
});

test('notification failure keeps the stored lead and marks it failed', async () => {
  const notifier = { enabled: true, async sendStaffNotification() { throw Object.assign(new Error('boom'), { code: 'resend_500' }); } };
  const d = deps({ notifier });
  const res = await submit(base(), d);
  assert.equal(res.status, 201);
  assert.equal(d.store.rows.length, 1);
  assert.equal(d.store.rows[0].notification_status, 'failed');
});

test('missing notifier configuration marks the lead as skipped', async () => {
  const d = deps({ notifier: { enabled: false } });
  const res = await submit(base(), d);
  assert.equal(res.status, 201);
  assert.equal(d.store.rows[0].notification_status, 'skipped');
});

test('server logs never contain personal data', async () => {
  const chunks = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => { chunks.push(String(chunk)); return true; };
  try {
    const d = deps({ notifier: { enabled: true, async sendStaffNotification() { throw new Error('Jordan Citizen jordan@example.com 0412345678'); } } });
    await submit(base(), d);
    await submit(base({ phone: '1' }), d);
  } finally {
    process.stdout.write = original;
  }
  const logs = chunks.join('');
  assert.ok(logs.includes('enquiry.stored'));
  for (const pii of ['Jordan', 'example.com', '0412345678', '2060', 'North Sydney', '203.0.113.9']) {
    assert.ok(!logs.includes(pii), `log leaked ${pii}`);
  }
});

test('legacy category "extension" is still accepted by the server schema', async () => {
  const d = deps();
  const res = await submit(base({ category: 'extension' }), d);
  assert.equal(res.status, 201);
  assert.equal(d.store.rows[0].category, 'extension');
});
