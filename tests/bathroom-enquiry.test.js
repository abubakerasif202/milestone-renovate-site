import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { createBathroomEnquiryService } from '../lib/bathroom-enquiry.js';
import { createHandler, calculatorDepsFromEnv } from '../lib/enquiry-handler.js';
import { BATHROOM_DEFAULTS, calculateBathroom } from '../public/js/lib/bathroom-calculator.js';
const payload = () => ({ enquiryType: 'bathroom_renovation_calculator', idempotencyKey: randomUUID(), name: 'Test Person', email: 'test@example.com', phone: '', postcode: '2000', message: '', consent: true, sourcePage: '/bathroom-renovation-cost', formStartedAt: Date.now() - 10000, options: { ...BATHROOM_DEFAULTS }, ...calculateBathroom() });
const deps = send => ({ ipSecret: 'test-secret', notifier: { enabled: true, sendStaffNotification: send } });
test('server recomputes all totals and forwards complete options, without a store', async () => {
  let sent;
  const service = createBathroomEnquiryService();
  const body = { ...payload(), costMin: 1, costMax: 2, weeksMin: 99, weeksMax: 100 };
  const result = await service({ body, ip: 'test' }, deps(async value => { sent = value; }));
  assert.equal(result.status, 201);
  assert.deepEqual([sent.enquiry.costMin, sent.enquiry.costMax, sent.enquiry.weeksMin, sent.enquiry.weeksMax], [20000, 30000, 2, 3]);
  assert.deepEqual(sent.enquiry.options, BATHROOM_DEFAULTS);
  assert.match(sent.enquiry.details, /labour|Labour/);
});
test('validates postcode, contacts, consent, options, honeypot and minimum form time', async () => {
  const service = createBathroomEnquiryService(); const d = deps(async () => assert.fail('must not send'));
  for (const change of [{ postcode: 'abcd' }, { email: '', phone: '' }, { consent: false }, { options: { size: 'giant' } }, { email: 'invalid' }]) assert.equal((await service({ body: { ...payload(), ...change }, ip: 'test' }, d)).status, 422);
  for (const change of [{ website: 'spam' }, { formStartedAt: Date.now() }, { formStartedAt: Date.now() + 999999 }]) assert.equal((await service({ body: { ...payload(), ...change }, ip: 'test' }, d)).status, 400);
});
test('email failure never succeeds; retries, concurrent requests and changed content are safe', async () => {
  const service = createBathroomEnquiryService(); let calls = 0; let fails = true; const references = [];
  const d = deps(async value => { calls++; references.push(value.reference); if (fails) throw new Error('provider unavailable'); });
  const request = { body: payload(), ip: 'test' };
  assert.equal((await service(request, d)).status, 503);
  fails = false;
  const results = await Promise.all([service(request, d), service(request, d)]);
  assert.ok(results.every(result => result.status === 201)); assert.equal(calls, 2);
  assert.equal(references[0], references[1]);
  assert.equal((await service({ ...request, body: { ...request.body, message: 'changed' } }, d)).status, 409);
});
test('limits attempts and refuses missing email config', async () => {
  const service = createBathroomEnquiryService(); const d = deps(async () => {});
  for (let i = 0; i < 5; i++) assert.equal((await service({ body: payload(), ip: 'same-ip' }, d)).status, 201);
  assert.equal((await service({ body: payload(), ip: 'same-ip' }, d)).status, 429);
  assert.equal((await service({ body: payload(), ip: 'other-ip' }, { ipSecret: 'test' })).status, 503);
  assert.equal(calculatorDepsFromEnv({}), null);
});
test('existing HTTP route accepts calculator with no Supabase dependencies and rejects foreign origins', async () => {
  let calls = 0;
  const server = http.createServer(createHandler(() => null, () => ({ ...deps(async () => { calls++; }), allowedOrigins: ['https://milestonerenovate.com'] })));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/enquiries`;
    const post = origin => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(payload()) });
    assert.equal((await post('https://evil.example')).status, 403);
    assert.equal((await post('https://milestonerenovate.com')).status, 201);
    assert.equal(calls, 1);
  } finally { server.close(); }
});

import { createResendNotifier } from '../lib/notifier.js';
test('real notifier adapter sends trusted bathroom brief to configured admin, including phone-only contact', async () => {
  let request;
  const notifier = createResendNotifier({ apiKey: 'mock-only', to: 'admin@milestonerenovate.com', from: 'mock@example.com', fetchImpl: async (_url, init) => { request = JSON.parse(init.body); return { ok: true }; } });
  const result = await createBathroomEnquiryService()({ body: { ...payload(), email: '', phone: '0412345678', name: '<Test Person>', costMin: 1, message: '<script>not executable</script>' }, ip: 'test' }, { ipSecret: 'mock-secret', notifier });
  assert.equal(result.status, 201);
  assert.deepEqual(request.to, ['admin@milestonerenovate.com']);
  assert.equal(Object.hasOwn(request, 'reply_to'), false);
  assert.match(request.text, /\$20,000–\$30,000/);
  assert.match(request.text, /bathroom_renovation_calculator/);
  assert.match(request.text, /\/bathroom-renovation-cost/);
  assert.match(request.html, /&lt;script&gt;/);
  assert.doesNotMatch(request.html, /<script>/);
});
