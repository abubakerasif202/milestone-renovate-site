import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { STEPS, TOTAL_STEPS, advance, back, buildPayload, initialState, progress, setCategory, validateStep, SCOPE_BY_CATEGORY, SCOPE_LABELS } from '../public/js/lib/wizard.js';
import { enquirySchema, SCOPE_OPTIONS } from '../lib/enquiry-schema.js';
import { submitEnquiry, sessionKey, clearSessionKey } from '../public/js/lib/enquiry-client.js';

const filled = () => ({
  ...initialState(), category: 'bathroom', suburb: 'Mosman', postcode: '2088', propertyType: 'house',
  scope: ['new_tiling', 'walk_in_shower'], layoutChange: 'minor', roomSize: 'medium', finishLevel: 'mid_range',
  budgetRange: '50k_100k', timeline: '3_6_months', details: '', name: 'Alex Lee', phone: '(02) 9876 5432', email: 'alex@example.com', consent: true,
});
const meta = () => ({ idempotencyKey: randomUUID(), startedAt: Date.now() - 30_000 });

test('wizard has nine input steps and progress reflects the current step', () => {
  assert.equal(TOTAL_STEPS, 9);
  assert.deepEqual(progress(initialState()), { current: 1, total: 9, percent: 11 });
  assert.equal(progress({ ...initialState(), step: 8 }).percent, 100);
});

test('cannot advance past a required step until it is valid, and errors are specific', () => {
  const start = initialState();
  const blocked = advance(start);
  assert.equal(blocked.state.step, 0);
  assert.ok(blocked.errors.category);
  const ok = advance(setCategory(start, 'kitchen'));
  assert.equal(ok.state.step, 1);
  assert.deepEqual(ok.errors, {});
});

test('optional steps can be skipped; back never goes below the first step', () => {
  let state = { ...initialState(), category: 'kitchen', postcode: '2000' };
  state = advance(advance(state).state).state; // location -> property
  assert.equal(STEPS[state.step].id, 'property');
  for (let i = 0; i < 5; i += 1) state = advance(state).state; // property, scope, size, finish, budget all optional
  assert.equal(STEPS[state.step].id, 'notes');
  for (let i = 0; i < 12; i += 1) state = back(state);
  assert.equal(state.step, 0);
});

test('location needs suburb or postcode and validates postcode', () => {
  assert.ok(validateStep({ ...initialState() }, 'location').postcode);
  assert.ok(validateStep({ ...initialState(), postcode: '0100' }, 'location').postcode);
  assert.deepEqual(validateStep({ ...initialState(), suburb: 'Mosman' }, 'location'), {});
  assert.deepEqual(validateStep({ ...initialState(), postcode: '2088' }, 'location'), {});
});

test('contact step validates name, AU phone, email and consent', () => {
  const errors = validateStep({ ...initialState(), phone: '123', email: 'x', name: '' }, 'contact');
  assert.deepEqual(Object.keys(errors).sort(), ['consent', 'email', 'name', 'phone']);
  assert.deepEqual(validateStep(filled(), 'contact'), {});
  assert.deepEqual(validateStep({ ...filled(), phone: '+61 412 345 678' }, 'contact'), {});
  assert.deepEqual(validateStep({ ...filled(), phone: '1800 008 883' }, 'contact'), {});
});

test('changing category drops scope options that no longer apply', () => {
  const next = setCategory({ ...initialState(), category: 'bathroom', scope: ['new_tiling', 'new_layout'] }, 'extension');
  assert.deepEqual(next.scope, []);
  assert.deepEqual(setCategory({ ...initialState(), scope: ['new_layout'] }, 'kitchen').scope, ['new_layout']);
});

test('every offered scope option is known to the server schema and has a label', () => {
  for (const options of Object.values(SCOPE_BY_CATEGORY)) {
    for (const option of options) {
      assert.ok(SCOPE_OPTIONS.includes(option), `${option} missing from server schema`);
      assert.ok(SCOPE_LABELS[option], `${option} missing label`);
    }
  }
});

test('a full payload and a minimal payload both satisfy the server schema', () => {
  const full = enquirySchema.safeParse(buildPayload(filled(), meta()));
  assert.ok(full.success, JSON.stringify(full.error?.issues));
  assert.equal(full.data.phone, '0298765432');

  const minimal = { ...initialState(), category: 'other', postcode: '2000', name: 'Bo Ng', phone: '0412345678', email: 'bo@example.com', consent: true };
  const parsed = enquirySchema.safeParse(buildPayload(minimal, meta()));
  assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
  assert.equal(parsed.data.details, undefined);
});

test('calculator-sourced submissions keep their source', () => {
  const payload = buildPayload(filled(), { ...meta(), source: 'calculator' });
  assert.equal(enquirySchema.parse(payload).source, 'calculator');
});

// --- API client ---------------------------------------------------------------------------

const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('client returns the reference on success and flags duplicates', async () => {
  assert.deepEqual(await submitEnquiry({}, { fetchImpl: reply(201, { ok: true, reference: 'MR-ABCD2345' }) }), { ok: true, reference: 'MR-ABCD2345', duplicate: false });
  assert.equal((await submitEnquiry({}, { fetchImpl: reply(200, { ok: true, reference: 'MR-ABCD2345', duplicate: true }) })).duplicate, true);
});

test('client maps failures to retryable / non-retryable results and never claims success', async () => {
  const validation = await submitEnquiry({}, { fetchImpl: reply(422, { fields: { email: 'bad' }, message: 'Check fields' }) });
  assert.equal(validation.ok, false); assert.equal(validation.kind, 'validation'); assert.equal(validation.fields.email, 'bad');
  const limited = await submitEnquiry({}, { fetchImpl: reply(429, { message: 'slow down' }) });
  assert.equal(limited.kind, 'rate_limited'); assert.equal(limited.retryable, false);
  const down = await submitEnquiry({}, { fetchImpl: reply(503, { ok: false, code: 'storage_unavailable' }) });
  assert.equal(down.kind, 'unavailable'); assert.equal(down.retryable, true);
  const network = await submitEnquiry({}, { fetchImpl: async () => { throw new TypeError('offline'); } });
  assert.equal(network.kind, 'network'); assert.equal(network.retryable, true);
  const htmlError = await submitEnquiry({}, { fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error('not json'); } }) });
  assert.equal(htmlError.ok, false);
  const ambiguous = await submitEnquiry({}, { fetchImpl: reply(200, { ok: true }) }); // 200 without a reference is not success
  assert.equal(ambiguous.ok, false);
});

test('a retry after failure reuses the same idempotency key until cleared', () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  const first = sessionKey(storage, 'wizard');
  assert.equal(sessionKey(storage, 'wizard'), first);
  clearSessionKey(storage, 'wizard');
  assert.notEqual(sessionKey(storage, 'wizard'), first);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.match(sessionKey(broken, 'x'), /^[0-9a-f-]{36}$/);
});
