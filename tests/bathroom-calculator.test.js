import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBathroom, BATHROOM_DEFAULTS, validateBathroomContact } from '../public/js/lib/bathroom-calculator.js';
const full = { size: 'large', subfloor: 'concrete', access: 'apartment_stairs_only', removeWalls: true, changeLayout: true, recessedNiche: true, package: 'all_inclusive' };
const fixtures = [
  [{}, [20000, 30000, 2, 3]], [{ size: 'medium' }, [22000, 32000, 2.5, 3.5]],
  [{ subfloor: 'concrete' }, [22000, 32000, 2.5, 3.5]], [{ access: 'apartment_with_lift' }, [21000, 31000, 2.5, 3.5]],
  [{ access: 'apartment_stairs_only' }, [22000, 32000, 3, 4]], [{ package: 'all_inclusive' }, [25000, 35000, 2, 3]],
  [{ diyDemo: true, diyPaint: true }, [16500, 26500, 1.5, 2.5]], [full, [36600, 46600, 5.5, 6.5]],
  [{ ...full, diyDemo: true, diyPaint: true }, [33100, 43100, 5, 6]],
];
for (const [index, [options, expected]] of fixtures.entries()) test(`exact supplied fixture ${index + 1}`, () => assert.deepEqual(Object.values(calculateBathroom(options)), expected));
test('rejects coerced flags, unknown choices and injected prices', () => {
  for (const options of [{ diyDemo: 'true' }, { access: 'roof' }, { costMin: 1 }, null]) assert.throws(() => calculateBathroom(options));
  assert.deepEqual(calculateBathroom(BATHROOM_DEFAULTS), calculateBathroom());
});
test('contact validation rejects alphabetic postcodes and requires valid contact and consent', () => {
  const valid = { name: 'Test Person', email: 'test@example.com', phone: '', postcode: '2000', consent: true, message: '' };
  assert.deepEqual(validateBathroomContact(valid), {});
  assert.ok(validateBathroomContact({ ...valid, postcode: 'abcd' }).postcode);
  assert.ok(validateBathroomContact({ ...valid, email: '' }).email);
  assert.ok(validateBathroomContact({ ...valid, consent: false }).consent);
});
