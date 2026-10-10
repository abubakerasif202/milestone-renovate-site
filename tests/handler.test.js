import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createHandler } from '../lib/enquiry-handler.js';
import { createMemoryStore } from '../lib/memory-store.js';

const payload = () => ({
  idempotencyKey: randomUUID(), name: 'Sam Smith', phone: '0298765432', email: 'sam@example.com',
  postcode: '2060', category: 'bathroom', details: 'Replace bath with walk-in shower please.',
  source: 'contact-form', consent: true, formStartedAt: Date.now() - 10_000,
});

async function withServer(getDeps, fn) {
  const server = http.createServer(createHandler(getDeps));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}
const post = (base, body, headers = {}) =>
  fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

const deps = () => ({ store: createMemoryStore(), notifier: { enabled: false }, ipSecret: 's', allowedOrigins: ['https://milestonerenovate.com'] });

test('POST stores a lead and responds 201 JSON with no-store caching', async () => {
  const d = deps();
  await withServer(() => d, async (base) => {
    const res = await post(base, payload());
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match((await res.json()).reference, /^MR-/);
    assert.equal(d.store.rows.length, 1);
  });
});

test('reports not_configured (503) instead of faking success when env is missing', async () => {
  await withServer(() => null, async (base) => {
    const res = await post(base, payload());
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, 'not_configured');
  });
});

test('rejects non-POST, bad content type, bad JSON, oversized and cross-origin requests', async () => {
  const d = deps();
  await withServer(() => d, async (base) => {
    assert.equal((await fetch(`${base}/api/enquiries`)).status, 405);
    assert.equal((await fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' })).status, 415);
    assert.equal((await post(base, '{not json')).status, 400);
    assert.equal((await post(base, { ...payload(), details: 'x'.repeat(30_000) })).status, 413);
    assert.equal((await post(base, payload(), { origin: 'https://evil.example' })).status, 403);
    assert.equal((await post(base, payload(), { origin: 'https://milestonerenovate.com' })).status, 201);
    assert.equal(d.store.rows.length, 1);
  });
});
