// Single source of truth for the supplied bathroom model. No DOM, location or GST assumptions.
import { isAuPhone, normalisePhone, isAuPostcode, isEmail } from './au.js';
const option = (label, cost, weeks) => Object.freeze({ label, cost, weeks });
export const BATHROOM_MODEL = Object.freeze({
  baseCost: 20000, costSpread: 10000, baseWeeks: 2, weeksSpread: 1,
  size: Object.freeze({ small: option('Small · below 5 m²', 0, 0), medium: option('Medium · 5–8 m²', 2000, .5), large: option('Large · 8–12+ m²', 4000, 1) }),
  subfloor: Object.freeze({ timber: option('Timber / on stumps', 0, 0), concrete: option('Concrete slab', 2000, .5) }),
  access: Object.freeze({ ground: option('Ground floor', 0, 0), apartment_with_lift: option('Apartment with lift', 1000, .5), apartment_stairs_only: option('Apartment · stairs only / no lift', 2000, 1) }),
  package: Object.freeze({ labour_only: option('Labour only / I source materials', 0, 0), all_inclusive: option('All-inclusive / materials included', 5000, 0) }),
  extras: Object.freeze({ removeWalls: option('Remove walls', 1500, .5), changeLayout: option('Change layout', 1500, .5), recessedNiche: option('Recessed niche', 600, 0), diyDemo: option('I handle demolition', -2500, -.5), diyPaint: option('I handle painting', -1000, 0) }),
});
export const BATHROOM_DEFAULTS = Object.freeze({ size: 'small', subfloor: 'timber', access: 'ground', package: 'labour_only', removeWalls: false, changeLayout: false, recessedNiche: false, diyDemo: false, diyPaint: false });
export function calculateBathroom(input = BATHROOM_DEFAULTS) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid bathroom selections');
  const options = { ...BATHROOM_DEFAULTS, ...input };
  if (Object.keys(options).some(key => !Object.hasOwn(BATHROOM_DEFAULTS, key))) throw new TypeError('Unknown bathroom option');
  const selected = [];
  for (const key of ['size', 'subfloor', 'access', 'package']) {
    if (!Object.hasOwn(BATHROOM_MODEL[key], options[key])) throw new TypeError(`Invalid ${key}`);
    selected.push(BATHROOM_MODEL[key][options[key]]);
  }
  for (const [key, value] of Object.entries(BATHROOM_MODEL.extras)) {
    if (typeof options[key] !== 'boolean') throw new TypeError(`Invalid ${key}`);
    if (options[key]) selected.push(value);
  }
  const costMin = BATHROOM_MODEL.baseCost + selected.reduce((sum, value) => sum + value.cost, 0);
  const weeksMin = BATHROOM_MODEL.baseWeeks + selected.reduce((sum, value) => sum + value.weeks, 0);
  return { costMin, costMax: costMin + BATHROOM_MODEL.costSpread, weeksMin, weeksMax: weeksMin + BATHROOM_MODEL.weeksSpread };
}
export const bathroomMoney = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
export function bathroomEntries(options) {
  calculateBathroom(options);
  return [...['size', 'subfloor', 'access', 'package'].map(key => [key, BATHROOM_MODEL[key][options[key] ?? BATHROOM_DEFAULTS[key]].label]), ...Object.entries(BATHROOM_MODEL.extras).filter(([key]) => options[key]).map(([, value]) => ['Selected option', value.label])];
}
export function bathroomBrief(options) {
  const result = calculateBathroom(options);
  return `Bathroom renovation estimate (indicative): ${bathroomMoney(result.costMin)}–${bathroomMoney(result.costMax)} AUD; ${result.weeksMin}–${result.weeksMax} weeks.\n${bathroomEntries(options).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
}
// Shared contact checks; server additionally enforces a strict envelope and field lengths.
export function validateBathroomContact(data) {
  const errors = {};
  if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120) errors.name = 'Enter your full name (2–120 characters).';
  if (!isAuPostcode(data.postcode ?? '')) errors.postcode = 'Enter a four-digit Australian postcode.';
  if (!data.email && !data.phone) errors.email = 'Enter an email address or Australian phone number.';
  if (data.email && !isEmail(data.email)) errors.email = 'Enter a valid email address.';
  if (data.phone && !isAuPhone(normalisePhone(data.phone))) errors.phone = 'Enter a valid Australian phone number.';
  if (data.consent !== true) errors.consent = 'Please agree to being contacted about your enquiry.';
  if (typeof data.message !== 'string' || data.message.length > 4000) errors.message = 'Keep your message under 4,000 characters.';
  return errors;
}
