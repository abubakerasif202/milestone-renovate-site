import { isAuPhone, isAuPostcode, isEmail, normalisePhone } from './au.js';

export const CATEGORY_LABELS = {
  kitchen: 'Kitchen', bathroom: 'Bathroom', whole_home: 'Whole home', extension: 'Extension or addition', other: 'Something else',
};

export const STEPS = [
  { id: 'category', title: 'What are you planning to renovate?' },
  { id: 'location', title: 'Where is the property?' },
  { id: 'property', title: 'What type of property is it?' },
  { id: 'scope', title: 'What changes are you considering?' },
  { id: 'size', title: 'Roughly how big is the space?' },
  { id: 'finish', title: 'What design and finish level suits you?' },
  { id: 'budget', title: 'Budget and timing' },
  { id: 'notes', title: 'Anything else we should know?' },
  { id: 'contact', title: 'How can we reach you?' },
];
export const TOTAL_STEPS = STEPS.length;

/** Contextual "scope" options per category (values match the server schema). */
export const SCOPE_BY_CATEGORY = {
  kitchen: ['new_layout', 'new_cabinetry', 'new_benchtops', 'new_appliances', 'relocate_plumbing', 'new_flooring', 'lighting_electrical', 'structural_changes'],
  bathroom: ['new_layout', 'new_tiling', 'new_fixtures', 'waterproofing', 'walk_in_shower', 'accessibility', 'relocate_plumbing'],
  whole_home: ['open_plan', 'new_layout', 'new_flooring', 'painting', 'lighting_electrical', 'structural_changes'],
  extension: ['single_storey_extension', 'second_storey', 'open_plan', 'outdoor_connection', 'structural_changes'],
  other: ['new_layout', 'new_flooring', 'painting', 'lighting_electrical', 'accessibility'],
};

export const SCOPE_LABELS = {
  new_layout: 'Change the layout', new_cabinetry: 'New cabinetry', new_benchtops: 'New benchtops', new_appliances: 'New appliances',
  relocate_plumbing: 'Move plumbing', new_tiling: 'New tiling', new_fixtures: 'New fixtures and fittings', waterproofing: 'Waterproofing',
  walk_in_shower: 'Walk-in shower', accessibility: 'Accessibility features', structural_changes: 'Structural changes',
  new_flooring: 'New flooring', painting: 'Painting', lighting_electrical: 'Lighting and electrical',
  single_storey_extension: 'Single-storey extension', second_storey: 'Second storey', open_plan: 'Open-plan living', outdoor_connection: 'Connection to outdoors',
};

export const OPTIONS = {
  propertyType: [['house', 'House'], ['townhouse', 'Townhouse'], ['apartment', 'Apartment'], ['strata_unit', 'Strata unit'], ['other', 'Other']],
  layoutChange: [['none', 'Keep the current layout'], ['minor', 'Minor adjustments'], ['major', 'Major layout change'], ['not_sure', 'Not sure yet']],
  roomSize: [['small', 'Compact'], ['medium', 'Average'], ['large', 'Generous'], ['not_sure', 'Not sure']],
  finishLevel: [['essential', 'Essential and practical'], ['mid_range', 'Mid-range'], ['premium', 'Premium and bespoke'], ['not_sure', 'Not sure yet']],
  budgetRange: [['under_50k', 'Under $50,000'], ['50k_100k', '$50,000–$100,000'], ['100k_250k', '$100,000–$250,000'], ['250k_plus', '$250,000+'], ['discuss', 'Prefer to discuss']],
  timeline: [['asap', 'As soon as practical'], ['3_6_months', 'In 3–6 months'], ['6_plus_months', 'In 6+ months'], ['exploring', 'Just exploring']],
};

export const initialState = () => ({
  step: 0,
  category: '', suburb: '', postcode: '', propertyType: '', scope: [], layoutChange: '', roomSize: '', finishLevel: '',
  budgetRange: '', timeline: '', details: '', name: '', phone: '', email: '', consent: false,
});

const clean = (value) => String(value ?? '').trim();

/** @returns {Record<string,string>} field -> message; empty object means the step is valid. */
export function validateStep(state, stepId) {
  const errors = {};
  if (stepId === 'category' && !(state.category in CATEGORY_LABELS)) errors.category = 'Please choose what you would like to renovate.';
  if (stepId === 'location') {
    const suburb = clean(state.suburb);
    const postcode = clean(state.postcode);
    if (!suburb && !postcode) errors.postcode = 'Please enter your suburb or postcode.';
    else if (postcode && !isAuPostcode(postcode)) errors.postcode = 'Please enter a valid 4-digit Australian postcode.';
    if (suburb && suburb.length < 2) errors.suburb = 'Please enter a valid suburb.';
  }
  if (stepId === 'notes' && clean(state.details).length > 4000) errors.details = 'Please keep your notes under 4,000 characters.';
  if (stepId === 'contact') {
    if (clean(state.name).length < 2) errors.name = 'Please enter your full name.';
    if (!isAuPhone(normalisePhone(clean(state.phone)))) errors.phone = 'Please enter a valid Australian phone number.';
    if (!isEmail(clean(state.email))) errors.email = 'Please enter a valid email address.';
    if (state.consent !== true) errors.consent = 'Please confirm you agree to us contacting you about your enquiry.';
  }
  return errors;
}

/** Returns a new state advanced one step, or the same state plus errors if the current step is invalid. */
export function advance(state) {
  const errors = validateStep(state, STEPS[state.step].id);
  if (Object.keys(errors).length > 0) return { state, errors };
  return { state: { ...state, step: Math.min(state.step + 1, TOTAL_STEPS - 1) }, errors: {} };
}

export const back = (state) => ({ ...state, step: Math.max(state.step - 1, 0) });

/** Changing category invalidates scope picks that are not offered for the new category. */
export function setCategory(state, category) {
  const allowed = new Set(SCOPE_BY_CATEGORY[category] ?? []);
  return { ...state, category, scope: state.scope.filter((s) => allowed.has(s)) };
}

export const progress = (state) => ({ current: state.step + 1, total: TOTAL_STEPS, percent: Math.round(((state.step + 1) / TOTAL_STEPS) * 100) });

/** Build the POST /api/enquiries body. Optional blanks are omitted. */
export function buildPayload(state, { idempotencyKey, startedAt, source = 'wizard', sourcePage = '/plan-your-renovation' }) {
  const wizard = {};
  if (state.propertyType) wizard.propertyType = state.propertyType;
  if (state.scope.length) wizard.scope = [...state.scope];
  if (state.roomSize) wizard.roomSize = state.roomSize;
  if (state.finishLevel) wizard.finishLevel = state.finishLevel;
  if (state.layoutChange) wizard.layoutChange = state.layoutChange;

  const payload = {
    idempotencyKey, source, sourcePage, wizard,
    category: state.category,
    name: clean(state.name), phone: clean(state.phone), email: clean(state.email),
    consent: state.consent === true,
    formStartedAt: startedAt,
  };
  for (const key of ['suburb', 'postcode', 'budgetRange', 'timeline', 'details']) {
    const value = clean(state[key]);
    if (value) payload[key] = value;
  }
  return payload;
}
