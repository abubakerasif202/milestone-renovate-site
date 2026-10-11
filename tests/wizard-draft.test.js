import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearDraft, loadDraft, restoreDraft, saveDraft, serializeDraft } from '../public/js/lib/wizard-draft.js';
import { initialState, setCategory } from '../public/js/lib/wizard.js';

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};
const filled = () => ({
  ...setCategory(initialState(), 'bathroom'), step: 4, suburb: 'Parramatta', postcode: '2150', propertyType: 'house',
  scope: ['waterproofing', 'new_tiling'], roomSize: 'medium', finishLevel: 'premium', budgetRange: '50k_100k', timeline: 'exploring',
  details: 'Replace the bath', name: 'Jo Bloggs', phone: '0412345678', email: 'jo@example.com', consent: true,
});

test('a draft never contains contact details or consent', () => {
  const json = JSON.stringify(serializeDraft(filled()));
  for (const secret of ['Jo Bloggs', '0412345678', 'jo@example.com', 'consent']) assert.ok(!json.includes(secret), `leaked ${secret}`);
});

test('free-text notes are never stored, even when they contain a phone number', () => {
  const json = JSON.stringify(serializeDraft({ ...filled(), details: 'Call me on 0412 999 888, I am Jo at 5 Smith St' }));
  assert.ok(!json.includes('0412 999 888') && !json.includes('Smith St'));
});

test('prototype-key categories in a tampered draft are rejected without throwing', () => {
  for (const category of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    const restored = restoreDraft({ v: 1, step: 3, category, scope: ['waterproofing'] }, initialState());
    assert.equal(restored.category, '');
    assert.deepEqual(restored.scope, []);
  }
});

test('saving then restoring round-trips the answers and the step', () => {
  const storage = memoryStorage();
  saveDraft(storage, filled());
  const restored = restoreDraft(loadDraft(storage), initialState());
  assert.equal(restored.step, 4);
  assert.equal(restored.category, 'bathroom');
  assert.equal(restored.suburb, '', 'free-text suburb is never persisted');
  assert.deepEqual(restored.scope, ['waterproofing', 'new_tiling']);
  assert.equal(restored.name, '');
  assert.equal(restored.consent, false);
});

test('tampered or stale storage cannot inject unknown values or crash', () => {
  const evil = JSON.stringify({ v: 1, step: 99, category: 'pool', propertyType: '<script>', scope: ['rm -rf', 'waterproofing'], postcode: 'abcd', suburb: 'x'.repeat(500), details: 'y'.repeat(9000) });
  const restored = restoreDraft(JSON.parse(evil), initialState());
  assert.equal(restored.category, '');
  assert.equal(restored.propertyType, '');
  assert.equal(restored.postcode, '');
  assert.equal(restored.suburb, '');
  assert.equal(restored.details, '', 'free text is never restored');
  assert.ok(restored.step >= 0 && restored.step <= 8);
  assert.deepEqual(restored.scope, [], 'scope is dropped when the category is not valid');
  const storage = memoryStorage();
  storage.setItem('mr-wizard-draft', '{not json');
  assert.equal(loadDraft(storage), null);
  assert.deepEqual(restoreDraft(null, initialState()), initialState());
});

test('clearing removes the draft; unavailable storage never throws', () => {
  const storage = memoryStorage();
  saveDraft(storage, filled());
  clearDraft(storage);
  assert.equal(loadDraft(storage), null);
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.doesNotThrow(() => { saveDraft(broken, filled()); clearDraft(broken); });
  assert.equal(loadDraft(broken), null);
});

test('postcode drafts never retain free-text personal information or invalid postcode ranges', () => {
  assert.equal(serializeDraft({ ...filled(), postcode: 'Call Jo on 0412999888' }).postcode, '');
  assert.equal(serializeDraft({ ...filled(), postcode: '0100' }).postcode, '');
});
