// The retained kitchen guide uses the existing market model. Bathroom fixtures are in bathroom-calculator.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateProject, formatRange, tierRange } from '../public/js/lib/price-estimate.js';
const kitchen = over => ({ project: 'kitchen', finish: 'mid_range', ...over });
test('kitchen source arithmetic and rounded ranges are preserved', () => {
  assert.deepEqual([tierRange('kitchen', 'premium').low, tierRange('kitchen', 'premium').high], [63375, 111000]);
  const result = estimateProject(kitchen());
  assert.deepEqual([result.lowAud, result.highAud], [36500, 63500]);
  assert.equal(formatRange(result), '$36,500 – $63,500');
  assert.equal(result.gst, 'inclusive');
  assert.deepEqual(result.overallWeeks, [10, 14]);
});
test('all kitchen finishes remain finite and ordered, scope is unpriced and own supply adds notice', () => {
  for (const finish of ['essential', 'mid_range', 'premium']) {
    const base = estimateProject(kitchen({ finish }));
    const scope = estimateProject(kitchen({ finish, layoutChange: true, wallRemoval: true, supply: 'own_supply' }));
    assert.ok(base.lowAud > 0 && base.lowAud <= base.highAud);
    assert.deepEqual([scope.lowAud, scope.highAud], [base.lowAud, base.highAud]);
    assert.equal(scope.unpricedScope.length, 2);
    assert.match(scope.ownSupplyNotice, /Labour-only pricing is not estimated/);
  }
});
test('retired bathroom engine and invalid kitchen inputs cannot produce a competing price', () => {
  for (const input of [null, {}, { project: 'bathroom', finish: 'premium', size: 'large', floor: 'concrete', access: 'ground' }, kitchen({ finish: 'gold' }), kitchen({ wallRemoval: 'yes' })]) assert.equal(estimateProject(input).ok, false);
});
