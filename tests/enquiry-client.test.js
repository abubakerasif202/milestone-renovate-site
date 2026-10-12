import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitEnquiry } from '../public/js/lib/enquiry-client.js';

const respond = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });

test('a request that never completes ends as a retryable, honest "cannot confirm" result instead of hanging', async () => {
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  // AbortSignal.timeout() timers are unref'd, so on some Node versions (e.g. 22) the loop would otherwise exit while this test waits.
  const keepAlive = setTimeout(() => {}, 2000);
  const result = await submitEnquiry({}, { fetchImpl: hang, timeoutMs: 30 }).finally(() => clearTimeout(keepAlive));
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'network');
  assert.equal(result.retryable, true);
  assert.match(result.message, /cannot confirm/);
  assert.match(result.message, /duplicate/);
});

test('oversized and forbidden requests are not offered as retryable', async () => {
  const tooLarge = await submitEnquiry({}, { fetchImpl: respond(413, { ok: false }) });
  assert.deepEqual([tooLarge.kind, tooLarge.retryable], ['rejected', false]);
  const forbidden = await submitEnquiry({}, { fetchImpl: respond(403, { ok: false, code: 'forbidden_origin' }) });
  assert.deepEqual([forbidden.kind, forbidden.retryable], ['rejected', false]);
});

test('server errors and malformed bodies stay retryable and never claim success', async () => {
  for (const fetchImpl of [respond(503, { ok: false, code: 'storage_unavailable' }), respond(502, null), respond(200, { ok: true })]) {
    const result = await submitEnquiry({}, { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.retryable, true);
  }
});
