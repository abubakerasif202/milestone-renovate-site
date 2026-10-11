import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { FINISH_LEVELS, PLUMBING_CHANGES, RENOVATION_TYPES, areaM2, estimateBathroom, validateInputs } from '../public/js/lib/estimate.js';

const base = (over = {}) => ({ lengthM: 2.5, widthM: 2, renovationType: 'full_refit', finish: 'mid_range', plumbing: 'none', ...over });
// TEST FIXTURE ONLY: not a Milestone rate card. Exists to exercise arithmetic safety in priced mode.
const fixtureCard = {
  approved: true, version: 'test-fixture', sourceDate: '2026-01-01', gstTreatment: 'inclusive', assumptions: ['fixture'], exclusions: [],
  roundTo: 500, rangePct: 0.15, plumbing: { none: 0, minor: 100, major: 200 }, flat: { accessibility: 1, strata: 1, olderHome: 1, limitedAccess: 1 },
  perM2: Object.fromEntries(RENOVATION_TYPES.map((t, i) => [t, Object.fromEntries(FINISH_LEVELS.map((f, j) => [f, 1000 + i * 100 + j * 50]))])),
};

test('side-length boundaries are inclusive at 1 m and 10 m', () => {
  for (const v of [1, 10, '1', '10']) assert.deepEqual(validateInputs(base({ lengthM: v, widthM: v })), {});
  for (const v of [0.99, 10.01, 0, -1]) assert.ok(validateInputs(base({ lengthM: v })).lengthM, `length ${v}`);
});

test('direct area boundaries are inclusive at 1 and 100 m2', () => {
  for (const v of [1, 100, '100']) assert.deepEqual(validateInputs(base({ areaInputM2: v })), {});
  for (const v of [0.5, 100.5, -5, 'abc', NaN, Infinity, null]) assert.ok(validateInputs(base({ areaInputM2: v })).areaInputM2, `area ${v}`);
});

test('non-numeric, non-finite and empty measurements are rejected, never calculated', () => {
  for (const v of [NaN, Infinity, -Infinity, 'abc', '', null, undefined, {}, []]) {
    const result = estimateBathroom(base({ lengthM: v }));
    assert.equal(result.ok, false, `lengthM=${String(v)}`);
    assert.ok(result.errors.lengthM);
  }
});

test('missing or unknown selections are rejected', () => {
  assert.ok(estimateBathroom({}).errors.renovationType);
  assert.ok(estimateBathroom(base({ finish: 'gold_plated' })).errors.finish);
  assert.ok(estimateBathroom(base({ plumbing: undefined })).errors.plumbing);
  assert.equal(estimateBathroom(null).ok, false);
});

test('every valid combination yields a finite planning result with a level and no price', () => {
  for (const renovationType of RENOVATION_TYPES) for (const finish of FINISH_LEVELS) for (const plumbing of PLUMBING_CHANGES) for (const size of [1, 4, 4.1, 8, 8.1, 100]) {
    const r = estimateBathroom(base({ renovationType, finish, plumbing, areaInputM2: size, lengthM: undefined, widthM: undefined }));
    assert.equal(r.ok, true);
    assert.ok(Number.isFinite(r.scopeScore) && r.scopeScore >= 1, JSON.stringify(r));
    assert.ok(['light', 'moderate', 'substantial', 'complex'].includes(r.level));
    assert.equal(r.mode, 'planning');
    assert.ok(!('lowAud' in r) && !('highAud' in r));
  }
});

test('area band edges fall in the documented band (4 and 8 m2 are inclusive)', () => {
  const score = (area) => estimateBathroom(base({ areaInputM2: area, lengthM: undefined, widthM: undefined })).scopeScore;
  assert.equal(score(4), score(1));
  assert.equal(score(4.1), score(1) + 1);
  assert.equal(score(8), score(4.1));
  assert.equal(score(8.1), score(1) + 2);
});

test('area rounds to one decimal and string inputs behave like numbers', () => {
  assert.equal(areaM2({ lengthM: '2.55', widthM: '2.55' }), 6.5);
  assert.equal(areaM2({ lengthM: 3, widthM: 3, areaInputM2: '' }), 9);
});

test('priced mode (fixture card) is finite, non-negative, ordered and rounded to the card step', () => {
  for (const renovationType of RENOVATION_TYPES) for (const finish of FINISH_LEVELS) for (const plumbing of PLUMBING_CHANGES) {
    for (const [lengthM, widthM] of [[1, 1], [10, 10]]) {
      const r = estimateBathroom(base({ renovationType, finish, plumbing, lengthM, widthM, accessibility: true }), fixtureCard);
      assert.equal(r.mode, 'priced');
      for (const v of [r.lowAud, r.highAud]) assert.ok(Number.isFinite(v) && v >= 0 && v % 500 === 0, String(v));
      assert.ok(r.lowAud <= r.highAud);
    }
  }
});

test('invalid inputs never reach the pricing arithmetic even with an approved card', () => {
  assert.equal(estimateBathroom(base({ lengthM: Infinity }), fixtureCard).ok, false);
});

test('team portraits stay unpublished until approved (identity/branding sign-off pending)', () => {
  const approved = /^TEAM_PORTRAITS_APPROVED = True/m.test(readFileSync(new URL('../build_site.py', import.meta.url), 'utf8'));
  const about = readFileSync(new URL('../public/about.html', import.meta.url), 'utf8');
  assert.equal(about.includes('team-card'), approved);
  assert.equal(existsSync(new URL('../public/assets/img/team/mohammad-mohsini-800.webp', import.meta.url)), approved);
  assert.equal(existsSync(new URL('../public/assets/fallback-james-creswick.svg', import.meta.url)), false);
});
