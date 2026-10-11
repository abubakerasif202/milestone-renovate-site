import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createResendNotifier } from '../lib/notifier.js';
import { enquirySchema } from '../lib/enquiry-schema.js';
import { estimateHandoffQuery } from '../public/js/lib/price-estimate.js';

// All network access is mocked. Nothing here can reach Resend, Supabase or production.
const calc = { project: 'bathroom', finish: 'mid_range', size: 'medium', floor: 'concrete', access: 'apartment', supply: 'supply_install', layoutChange: true };
const enquiry = (over = {}) => ({
  idempotencyKey: '7b1f3f0e-6a52-4c6e-9d6b-0a3d2f1c9e11', name: 'Test Person', phone: '0412 345 678', email: 'test@example.com', postcode: '2000',
  category: 'bathroom', source: 'calculator', sourcePage: '/plan-your-renovation', consent: true, wizard: { planning: { version: 1, estimate: calc } }, ...over,
});

test('staff notifications go to the configured recipient (admin@milestonerenovate.com) and include the estimate shown', async () => {
  const calls = [];
  const notifier = createResendNotifier({
    apiKey: 'test-key', to: 'admin@milestonerenovate.com', from: 'Milestone Renovate <enquiries@milestonerenovate.com>',
    fetchImpl: async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true }; },
  });
  assert.equal(notifier.enabled, true);
  const parsed = enquirySchema.parse(enquiry());
  await notifier.sendStaffNotification({ reference: 'MR-TEST0001', enquiry: parsed });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body.to, ['admin@milestonerenovate.com']);
  assert.equal(calls[0].body.reply_to, 'test@example.com');
  assert.match(calls[0].body.text, /Estimate · Indicative range shown \(incl\. GST\): \$\d{2},\d{3} – \$\d{2,3},\d{3}/);
  assert.match(calls[0].body.text, /Estimate · Layout change: Yes/);
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'enquiry-notify/MR-TEST0001');
});

test('notifier stays disabled (no email attempted) unless fully configured, so a recipient change cannot half-apply', async () => {
  for (const cfg of [{ apiKey: 'k', to: '', from: 'f' }, { apiKey: '', to: 'admin@milestonerenovate.com', from: 'f' }]) {
    assert.equal(createResendNotifier(cfg).enabled, false);
  }
});

test('recipient addresses are never hard-coded in server code', () => {
  for (const f of ['../lib/notifier.js', '../lib/enquiry-handler.js', '../api/enquiries.js']) {
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /[\w.]+@milestone(renovate|development)\.com/, f);
  }
});

test('the server rejects tampered or incomplete calculator selections', () => {
  assert.ok(enquirySchema.safeParse(enquiry()).success);
  assert.ok(!enquirySchema.safeParse(enquiry({ wizard: { planning: { version: 1, estimate: { ...calc, finish: 'gold' } } } })).success);
  assert.ok(!enquirySchema.safeParse(enquiry({ wizard: { planning: { version: 1, estimate: { project: 'bathroom', finish: 'premium' } } } })).success);
  assert.ok(!enquirySchema.safeParse(enquiry({ wizard: { planning: { version: 1, estimate: { ...calc, lowAud: 1 } } } })).success, 'client-supplied prices are not accepted');
});

test('hand-off query carries the whole selection and only whitelisted values', () => {
  const q = new URLSearchParams(estimateHandoffQuery({ ...calc, injected: '<script>', lowAud: 5 }));
  assert.equal(q.get('category'), 'bathroom');
  assert.equal(q.get('from'), 'calculator');
  assert.equal(q.get('size'), 'medium');
  assert.equal(q.get('plumbing'), '1');
  const est = JSON.parse(q.get('estimate'));
  assert.deepEqual(Object.keys(est).sort(), ['access', 'finish', 'floor', 'layoutChange', 'project', 'size', 'supply']);
  const kq = new URLSearchParams(estimateHandoffQuery({ project: 'kitchen', finish: 'premium', wallRemoval: true }));
  assert.equal(kq.get('category'), 'kitchen');
  assert.equal(kq.get('layout'), 'major');
  assert.equal(kq.has('size'), false);
});
