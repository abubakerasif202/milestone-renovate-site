import { sanitizePlanningContext } from './planning-context.js';
import { isAuPhone, isAuPostcode, isEmail, normalisePhone } from './au.js';

export const CATEGORY_LABELS = {
  kitchen: 'Kitchen', bathroom: 'Bathroom', whole_home: 'Whole home', other: 'Something else',
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
  other: ['new_layout', 'new_flooring', 'painting', 'lighting_electrical', 'accessibility'],
};

export const SCOPE_LABELS = {
  new_layout: 'Change the layout', new_cabinetry: 'New cabinetry', new_benchtops: 'New benchtops', new_appliances: 'New appliances',
  relocate_plumbing: 'Move plumbing', new_tiling: 'New tiling', new_fixtures: 'New fixtures and fittings', waterproofing: 'Waterproofing',
  walk_in_shower: 'Walk-in shower', accessibility: 'Accessibility features', structural_changes: 'Structural changes',
  new_flooring: 'New flooring', painting: 'Painting', lighting_electrical: 'Lighting and electrical',
  open_plan: 'Open-plan living',
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
  if (stepId === 'category' && !Object.hasOwn(CATEGORY_LABELS, state.category)) errors.category = 'Please choose what you would like to renovate.';
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
  const planning = sanitizePlanningContext(state.planning);
  if (planning.planner || planning.studio || planning.estimate) wizard.planning = planning;
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

/** Map planning choices to existing questionnaire fields without manufacturing answers. */
export function applyPlanningContext(state, context) {
  const planning = sanitizePlanningContext(context);
  const planner = planning.planner;
  const studio = planning.studio;
  const estimate = planning.estimate;
  let next = { ...state, planning };
  if (planning.postcode) next.postcode = planning.postcode;
  if (estimate) {
    next = setCategory(next, estimate.project);
    next.finishLevel = estimate.finish;
    if (estimate.project === 'bathroom') {
      next.roomSize = estimate.size;
      if (estimate.access === 'apartment') next.propertyType = 'apartment';
    }
    next.layoutChange = estimate.layoutChange || estimate.wallRemoval ? 'major' : 'none';
    const picks = [...next.scope];
    if (estimate.layoutChange && estimate.project === 'bathroom') picks.push('relocate_plumbing');
    if (estimate.layoutChange) picks.push('new_layout');
    if (estimate.wallRemoval) picks.push('structural_changes');
    next.scope = [...new Set(picks)].filter((item) => (estimate.project === 'bathroom' ? true : item !== 'relocate_plumbing'));
  }
  if (planner) {
    next = setCategory(next, 'bathroom');
    if (planner.finish) next.finishLevel = planner.finish;
    if (planner.renovationType) next.layoutChange = planner.renovationType === 'full_refit_layout' ? 'major' : 'none';
    const area = planner.areaInputM2 ?? (planner.lengthM && planner.widthM ? planner.lengthM * planner.widthM : null);
    if (area) next.roomSize = area <= 4 ? 'small' : area <= 8 ? 'medium' : 'large';
    const picks = [...next.scope];
    if (planner.plumbing && planner.plumbing !== 'none') picks.push('relocate_plumbing');
    if (planner.waterproofing === 'replace') picks.push('waterproofing');
    if (planner.tiling && planner.tiling !== 'retain') picks.push('new_tiling');
    if (planner.shower === 'walk_in') picks.push('walk_in_shower');
    if (planner.accessibility) picks.push('accessibility');
    if (planner.renovationType === 'full_refit_layout') picks.push('new_layout');
    next.scope = [...new Set(picks)];
    if (planner.access === 'apartment') next.propertyType = 'apartment';
    const timeline = { exploring: 'exploring', '0_3': 'asap', '3_6': '3_6_months', '6_12': '6_plus_months', '12_plus': '6_plus_months' };
    if (planner.timeframe) next.timeline = timeline[planner.timeframe];
  }
  if (studio?.room) {
    next = setCategory(next, { bathroom: 'bathroom', kitchen: 'kitchen', living: 'whole_home' }[studio.room]);
    if (studio.layout) next.layoutChange = studio.layout === 'retain' ? 'none' : 'major';
  }
  return next;
}
export function answeredSteps(state) {
  return new Set([
    ...(state.category ? ['category'] : []), ...(state.postcode ? ['location'] : []),
    ...(state.propertyType ? ['property'] : []), ...(state.scope.length && state.layoutChange ? ['scope'] : []),
    ...(state.roomSize ? ['size'] : []), ...(state.finishLevel ? ['finish'] : []),
    ...(state.budgetRange && state.timeline ? ['budget'] : []),
  ]);
}
