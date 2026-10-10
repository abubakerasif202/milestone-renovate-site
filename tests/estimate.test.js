import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATE_CARD, areaM2, estimateBathroom, toQuestionnaireParams, validateInputs } from '../public/js/lib/estimate.js';

const input = (over = {}) => ({ lengthM: 2.5, widthM: 2, renovationType: 'full_refit', finish: 'mid_range', plumbing: 'none', ...over });

// TEST FIXTURE ONLY — these numbers are NOT Milestone prices.
const FIXTURE_CARD = {
  approved: true, version: 'fixture-1', roundTo: 100, rangePct: 0.1,
  perM2: { refresh: { essential: 1, mid_range: 2, premium: 3 }, full_refit: { essential: 10, mid_range: 20, premium: 30 }, full_refit_layout: { essential: 11, mid_range: 21, premium: 31 } },
  plumbing: { none: 0, minor: 100, major: 1000 },
  flat: { accessibility: 50, strata: 0, olderHome: 0, limitedAccess: 0 },
};

test('ships with no approved rate card, so it never produces dollar figures', () => {
  assert.equal(RATE_CARD.approved, false);
  const result = estimateBathroom(input());
  assert.equal(result.mode, 'planning');
  assert.equal(result.lowAud, undefined);
  assert.equal(result.highAud, undefined);
  assert.ok(result.drivers.length > 0);
});

test('planning level rises with scope', () => {
  const light = estimateBathroom(input({ renovationType: 'refresh', finish: 'essential', lengthM: 2, widthM: 1.5 }));
  const heavy = estimateBathroom(input({ renovationType: 'full_refit_layout', finish: 'premium', plumbing: 'major', lengthM: 3, widthM: 3, accessibility: true, strata: true }));
  assert.equal(light.level, 'light');
  assert.equal(heavy.level, 'complex');
  assert.ok(heavy.scopeScore > light.scopeScore);
});

test('area is length x width rounded to one decimal', () => {
  assert.equal(areaM2({ lengthM: 2.55, widthM: 2 }), 5.1);
});

test('validates measurements and choices', () => {
  assert.deepEqual(Object.keys(validateInputs({ lengthM: 0, widthM: 'x', renovationType: 'x', finish: '', plumbing: undefined })).sort(), ['finish', 'lengthM', 'plumbing', 'renovationType', 'widthM']);
  assert.deepEqual(validateInputs(input()), {});
  assert.equal(estimateBathroom(input({ lengthM: 99 })).ok, false);
});

test('with an approved card the calculation is rate x area plus adjustments, rounded, with a range', () => {
  // 2.5 x 2 = 5 m2 x 20 = 100, + minor plumbing 100 + accessibility 50 = 250
  const r = estimateBathroom(input({ plumbing: 'minor', accessibility: true }), FIXTURE_CARD);
  assert.equal(r.mode, 'priced');
  assert.equal(r.rateCardVersion, 'fixture-1');
  assert.equal(r.lowAud, 200); // 225 -> nearest 100
  assert.equal(r.highAud, 300); // 275 -> nearest 100
});

test('an approved card missing a rate fails loudly rather than guessing', () => {
  const broken = { ...FIXTURE_CARD, perM2: { refresh: {} } };
  assert.throws(() => estimateBathroom(input(), broken), /missing a rate/);
});

test('questionnaire hand-off carries only whitelisted values', () => {
  const params = new URLSearchParams(toQuestionnaireParams(input({ renovationType: 'full_refit_layout', plumbing: 'major', finish: 'premium' })));
  assert.equal(params.get('category'), 'bathroom');
  assert.equal(params.get('from'), 'calculator');
  assert.equal(params.get('finish'), 'premium');
  assert.equal(params.get('layout'), 'major');
  assert.equal(params.get('plumbing'), '1');
});
