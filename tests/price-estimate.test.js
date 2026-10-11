import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateProject, formatRange, tierRange, validateEstimateInput } from '../public/js/lib/price-estimate.js';
import { BATHROOM_ADJUSTMENTS, BATHROOM_SIZES, ESTIMATE_FLAGS, ROUND_TO, TIER_SOURCES } from '../public/js/lib/pricing-config.js';

const bath = (over = {}) => ({ project: 'bathroom', finish: 'mid_range', size: 'medium', floor: 'concrete', access: 'ground', supply: 'supply_install', ...over });
const kitchen = (over = {}) => ({ project: 'kitchen', finish: 'mid_range', ...over });

test('base tier ranges are the equal-weight mean of the published source ranges', () => {
  const t = tierRange('bathroom', 'mid_range');
  assert.equal(t.low, (23000 + 30000) / 2);
  assert.equal(t.high, (40250 + 45000) / 2);
  const k = tierRange('kitchen', 'premium');
  assert.equal(k.low, (51750 + 75000) / 2);
  assert.equal(k.high, (92000 + 130000) / 2);
});

test('tiers are contiguous and ascending in every project', () => {
  for (const project of Object.keys(TIER_SOURCES)) {
    const e = tierRange(project, 'essential'); const m = tierRange(project, 'mid_range'); const p = tierRange(project, 'premium');
    assert.ok(e.low < m.low && m.low < p.low && e.high < m.high && m.high < p.high, project);
  }
});

test('representative bathroom scenarios (medium, concrete, ground, mid-range baseline)', () => {
  const r = estimateProject(bath());
  assert.deepEqual([r.lowAud, r.highAud], [26500, 43000]);
  assert.equal(r.onSiteLabel, '3-6 weeks');
  assert.equal(formatRange(r), '$26,500 – $43,000');
  const small = estimateProject(bath({ size: 'small', finish: 'essential' }));
  assert.deepEqual([small.lowAud, small.highAud], [13500, 20000]);
  const premiumLarge = estimateProject(bath({ size: 'large', finish: 'premium', layoutChange: true, wallRemoval: true, recessedNiche: true }));
  assert.ok(premiumLarge.highAud > 90000 && premiumLarge.lowAud < premiumLarge.highAud);
});

test('each option moves the estimate in the documented direction and by the documented amount', () => {
  const base = estimateProject(bath());
  const raw = (adj) => [base.lowAud + adj.low, base.highAud + adj.high];
  const within = (r, [lo, hi]) => Math.abs(r.lowAud - lo) <= ROUND_TO && Math.abs(r.highAud - hi) <= ROUND_TO;
  assert.ok(within(estimateProject(bath({ layoutChange: true })), raw(BATHROOM_ADJUSTMENTS.layoutChange)));
  assert.ok(within(estimateProject(bath({ access: 'apartment' })), raw(BATHROOM_ADJUSTMENTS.apartment)));
  assert.ok(within(estimateProject(bath({ floor: 'timber' })), raw(BATHROOM_ADJUSTMENTS.timberFloor)));
  assert.ok(within(estimateProject(bath({ recessedNiche: true })), raw(BATHROOM_ADJUSTMENTS.recessedNiche)));
  const diy = estimateProject(bath({ diyDemolition: true }));
  assert.ok(diy.lowAud < base.lowAud && diy.highAud < base.highAud);
  assert.ok(estimateProject(bath({ size: 'large' })).highAud > base.highAud);
  assert.ok(estimateProject(bath({ size: 'small' })).highAud < base.highAud);
});

test('GST is never added on top: results equal the GST-inclusive source arithmetic', () => {
  const r = estimateProject(bath());
  assert.equal(r.gst, 'inclusive');
  assert.ok(r.highAud <= Math.ceil((40250 + 45000) / 2 / ROUND_TO) * ROUND_TO);
});

test('labour-only is not priced: own supply keeps the range and adds a notice', () => {
  const own = estimateProject(bath({ supply: 'own_supply' }));
  const std = estimateProject(bath());
  assert.equal(own.lowAud, std.lowAud);
  assert.match(own.ownSupplyNotice, /Labour-only pricing is not estimated/);
  assert.equal(std.ownSupplyNotice, null);
});

test('kitchen estimates use tier ranges and list unpriced scope rather than inventing prices', () => {
  const plain = estimateProject(kitchen());
  const scoped = estimateProject(kitchen({ layoutChange: true, wallRemoval: true }));
  assert.equal(plain.lowAud, scoped.lowAud);
  assert.equal(scoped.unpricedScope.length, 2);
  assert.deepEqual(plain.overallWeeks, [10, 14]);
  assert.ok(plain.exclusions.some((e) => /Appliances/.test(e)));
});

test('timeline lead items appear only for the selections that trigger them', () => {
  assert.equal(estimateProject(bath()).beforeStartWeeksMax, 0);
  assert.equal(estimateProject(bath({ access: 'apartment' })).beforeStartWeeksMax, 8);
  assert.equal(estimateProject(bath({ finish: 'premium' })).beforeStartWeeksMax, 8);
});

test('assumption-based allowances are flagged, sourced ones are not', () => {
  const r = estimateProject(bath({ size: 'large', wallRemoval: true, layoutChange: true }));
  const ids = r.assumptionsUsed.map((a) => a.id);
  assert.ok(ids.includes('wallRemoval') && ids.includes('base'));
  assert.ok(!ids.includes('layoutChange'));
});

test('every combination of every option is finite, positive, ordered and rounded', () => {
  const flagSets = [[], ...ESTIMATE_FLAGS.map((f) => [f]), ESTIMATE_FLAGS];
  let count = 0;
  for (const finish of ['essential', 'mid_range', 'premium']) for (const size of Object.keys(BATHROOM_SIZES)) for (const floor of ['concrete', 'timber']) for (const access of ['ground', 'apartment']) for (const flags of flagSets) {
    const input = bath({ finish, size, floor, access, ...Object.fromEntries(flags.map((f) => [f, true])) });
    const r = estimateProject(input);
    assert.equal(r.ok, true);
    for (const v of [r.lowAud, r.highAud]) assert.ok(Number.isFinite(v) && v > 0 && v % ROUND_TO === 0, JSON.stringify(input));
    assert.ok(r.lowAud <= r.highAud, JSON.stringify(input));
    count += 1;
  }
  assert.equal(count, 3 * 3 * 2 * 2 * 7);
  for (const finish of ['essential', 'mid_range', 'premium']) {
    const r = estimateProject(kitchen({ finish }));
    assert.ok(r.lowAud <= r.highAud && Number.isFinite(r.highAud));
  }
});

test('invalid input is rejected with errors, never calculated', () => {
  for (const bad of [null, undefined, 'x', {}, bath({ finish: 'gold' }), bath({ size: 'huge' }), bath({ floor: undefined }), bath({ layoutChange: 'yes' }), { project: 'extension', finish: 'premium' }]) {
    const r = estimateProject(bad);
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.ok(Object.keys(r.errors).length);
  }
  assert.deepEqual(validateEstimateInput(kitchen()), {});
  assert.equal(JSON.stringify(estimateProject(bath())).includes('NaN'), false);
});
