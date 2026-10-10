import { CATEGORY_LABELS, OPTIONS, SCOPE_BY_CATEGORY, TOTAL_STEPS } from './wizard.js';

const KEY = 'mr-wizard-draft';
const VERSION = 1;
const allowed = (name) => new Set(OPTIONS[name].map(([value]) => value));

/**
 * The part of the questionnaire worth keeping across a reload. Contact details and consent are
 * deliberately never stored: they are personal data and consent must be given in the same sitting.
 * Free-text project notes are not stored either, since visitors often type names or numbers into them.
 */
export function serializeDraft(state) {
  return {
    v: VERSION, step: state.step, category: state.category, suburb: state.suburb, postcode: state.postcode,
    propertyType: state.propertyType, scope: state.scope, layoutChange: state.layoutChange, roomSize: state.roomSize,
    finishLevel: state.finishLevel, budgetRange: state.budgetRange, timeline: state.timeline,
  };
}

/** Merge a stored draft into `base`, accepting only values the wizard itself could have produced. */
export function restoreDraft(draft, base) {
  if (!draft || draft.v !== VERSION) return base;
  const pick = (name, value) => (allowed(name).has(value) ? value : '');
  const category = Object.hasOwn(CATEGORY_LABELS, draft.category) ? draft.category : '';
  const scopeOptions = SCOPE_BY_CATEGORY[category] ?? [];
  const text = (value, max) => String(value ?? '').slice(0, max);
  const step = Number.isInteger(draft.step) ? Math.min(Math.max(draft.step, 0), TOTAL_STEPS - 1) : 0;
  return {
    ...base,
    step: category ? step : 0,
    category,
    suburb: text(draft.suburb, 80),
    postcode: /^\d{4}$/.test(draft.postcode ?? '') ? draft.postcode : '',
    propertyType: pick('propertyType', draft.propertyType),
    scope: Array.isArray(draft.scope) ? draft.scope.filter((value) => scopeOptions.includes(value)) : [],
    layoutChange: pick('layoutChange', draft.layoutChange),
    roomSize: pick('roomSize', draft.roomSize),
    finishLevel: pick('finishLevel', draft.finishLevel),
    budgetRange: pick('budgetRange', draft.budgetRange),
    timeline: pick('timeline', draft.timeline),
  };
}

export function loadDraft(storage) {
  try { return JSON.parse(storage.getItem(KEY)); } catch { return null; }
}

export function saveDraft(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(serializeDraft(state))); } catch { /* storage unavailable: the form still works */ }
}

export function clearDraft(storage) {
  try { storage.removeItem(KEY); } catch { /* storage unavailable */ }
}
