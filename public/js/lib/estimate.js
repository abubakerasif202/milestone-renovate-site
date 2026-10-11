// Bathroom renovation planning estimator.
//
// IMPORTANT: no Milestone rate card has been approved. Until `RATE_CARD.approved` is true the
// estimator returns a *planning profile* (relative scope level + cost drivers) and NEVER a dollar
// figure. The weights below are unitless complexity points, not prices. To enable pricing, supply a
// commercially approved rate card (see `PricedRateCard`) and set approved: true — the arithmetic is
// covered by tests using a clearly-labelled fixture card.

export const RENOVATION_TYPES = ['refresh', 'full_refit', 'full_refit_layout'];
export const FINISH_LEVELS = ['essential', 'mid_range', 'premium'];
export const PLUMBING_CHANGES = ['none', 'minor', 'major'];
export const SITE_FLAGS = ['accessibility', 'strata', 'olderHome', 'limitedAccess'];
export const PLANNER_CHOICES = Object.freeze({
  floorConstruction: ['concrete', 'timber', 'unknown'], access: ['ground', 'upper', 'apartment'],
  structural: ['none', 'wall_removal', 'structural', 'unknown'], shower: ['retain', 'new', 'walk_in'],
  bath: ['none', 'retain', 'new', 'freestanding'], vanity: ['retain', 'single', 'double', 'custom'],
  toilet: ['retain', 'new', 'concealed'], waterproofing: ['assess', 'replace'],
  tiling: ['retain', 'floor', 'wet_zones', 'full_height'], timeframe: ['exploring', '0_3', '3_6', '6_12', '12_plus'],
});
export const PLANNER_FLAGS = [...SITE_FLAGS, 'underfloorHeating', 'featureLighting', 'customStorage'];
export const SIZE_PRESETS = Object.freeze({ small: { lengthM: 2, widthM: 1.8 }, medium: { lengthM: 2.5, widthM: 2.4 }, large: { lengthM: 3, widthM: 3 } });

/** Unitless complexity points used only for the planning profile. */
export const PLANNING_WEIGHTS = Object.freeze({
  renovationType: { refresh: 1, full_refit: 3, full_refit_layout: 4 },
  finish: { essential: 0, mid_range: 1, premium: 2 },
  plumbing: { none: 0, minor: 1, major: 2 },
  site: { accessibility: 1, strata: 1, olderHome: 1, limitedAccess: 1 },
  areaBands: [{ maxM2: 4, points: 0 }, { maxM2: 8, points: 1 }, { maxM2: Infinity, points: 2 }],
});

/** @typedef {{approved:true, version:string, roundTo:number, rangePct:number, perM2:Record<string,Record<string,number>>, plumbing:Record<string,number>, flat:Record<string,number>}} PricedRateCard */
export const RATE_CARD = Object.freeze({ approved: false, version: null, sourceDate: null, gstTreatment: null, assumptions: [], exclusions: [], perM2: null, plumbing: null, flat: null, adjustments: null, roundTo: null, rangePct: null });

export const LEVELS = [
  { max: 3, id: 'light', label: 'Light scope' },
  { max: 6, id: 'moderate', label: 'Moderate scope' },
  { max: 9, id: 'substantial', label: 'Substantial scope' },
  { max: Infinity, id: 'complex', label: 'Complex scope' },
];

const LIMITS = { minSide: 1, maxSide: 10 };

export function validateInputs(input) {
  const errors = {};
  const directArea = input?.areaInputM2 !== undefined && input.areaInputM2 !== '';
  if (directArea && (!Number.isFinite(Number(input.areaInputM2)) || Number(input.areaInputM2) < 1 || Number(input.areaInputM2) > 100)) errors.areaInputM2 = 'Enter a floor area between 1 and 100 square metres.';
  for (const key of directArea ? [] : ['lengthM', 'widthM']) {
    const value = Number(input?.[key]);
    if (!Number.isFinite(value) || value < LIMITS.minSide || value > LIMITS.maxSide) {
      errors[key] = `Enter a measurement between ${LIMITS.minSide} and ${LIMITS.maxSide} metres.`;
    }
  }
  if (!RENOVATION_TYPES.includes(input?.renovationType)) errors.renovationType = 'Choose the type of renovation.';
  if (!FINISH_LEVELS.includes(input?.finish)) errors.finish = 'Choose a finish level.';
  if (!PLUMBING_CHANGES.includes(input?.plumbing)) errors.plumbing = 'Choose the plumbing changes expected.';
  for (const [key, choices] of Object.entries(PLANNER_CHOICES)) {
    if (input?.[key] !== undefined && !choices.includes(input[key])) errors[key] = 'Choose one of the available options.';
  }
  for (const key of PLANNER_FLAGS) if (input?.[key] !== undefined && typeof input[key] !== 'boolean') errors[key] = 'Choose a valid option.';
  return errors;
}

export const areaM2 = (input) => Math.round((input.areaInputM2 !== undefined && input.areaInputM2 !== '' ? Number(input.areaInputM2) : Number(input.lengthM) * Number(input.widthM)) * 10) / 10;

function driversFor(input) {
  const drivers = [];
  if (input.renovationType === 'full_refit_layout') drivers.push('A new layout usually means moving walls, services or fixtures.');
  if (input.renovationType !== 'refresh') drivers.push('Full refits include demolition, waterproofing and re-tiling.');
  if (input.plumbing !== 'none') drivers.push('Relocating plumbing adds trade work and may change floor and wall preparation.');
  if (input.finish === 'premium') drivers.push('Premium fixtures and finishes widen the cost range considerably.');
  if (input.accessibility) drivers.push('Accessibility features can affect layout, fixtures and floor falls.');
  if (input.strata) drivers.push('Strata approvals and building rules can affect timing and scope.');
  if (input.olderHome) drivers.push('Older homes can reveal hidden conditions once walls and floors are opened.');
  if (input.limitedAccess) drivers.push('Limited site access can add time to deliveries and removals.');
  if (input.floorConstruction === 'timber') drivers.push('Timber floors need assessment of stiffness, substrate and wet-area preparation.');
  if (input.floorConstruction === 'unknown') drivers.push('Confirm floor construction during the site assessment before finalising scope.');
  if (input.access === 'upper' || input.access === 'apartment') drivers.push('Upper-floor or apartment access affects deliveries, waste removal and building coordination.');
  if (['wall_removal', 'structural'].includes(input.structural)) drivers.push('Wall or structural changes require an assessment of approvals, engineering and services.');
  if (input.structural === 'unknown') drivers.push('Wall structure and services need verification before a new layout is confirmed.');
  if (input.tiling === 'full_height') drivers.push('Full-height tiling increases the surface area and preparation involved.');
  if (input.waterproofing === 'replace') drivers.push('New waterproofing requires substrate preparation and coordination with tiling.');
  if (input.shower === 'walk_in') drivers.push('Walk-in showers require coordinated drainage, floor falls and water containment.');
  if (input.bath === 'freestanding') drivers.push('A freestanding bath needs adequate clearance and confirmed service positions.');
  if (input.vanity === 'custom' || input.customStorage) drivers.push('Custom joinery introduces detailing, fabrication and installation coordination.');
  if (input.toilet === 'concealed') drivers.push('A concealed cistern needs wall-depth and maintenance-access checks.');
  if (input.underfloorHeating) drivers.push('Underfloor heating adds electrical and floor-build-up coordination.');
  if (input.featureLighting) drivers.push('Feature lighting needs electrical planning and suitable wet-area fittings.');
  return drivers;
}

function extraComplexity(input) {
  return Number(input.floorConstruction === 'timber') + Number(['upper', 'apartment'].includes(input.access))
    + (['wall_removal', 'structural'].includes(input.structural) ? 2 : 0)
    + Number(input.tiling === 'full_height') + Number(input.shower === 'walk_in')
    + Number(input.vanity === 'custom' || input.customStorage === true) + Number(input.toilet === 'concealed')
    + Number(input.underfloorHeating === true);
}

function savingsFor(input) {
  const savings = [];
  if (input.plumbing !== 'none' || input.renovationType === 'full_refit_layout') savings.push('Compare a layout that retains existing service positions before committing to relocation.');
  if (input.tiling === 'full_height') savings.push('Compare full-height tiling with a considered mix of tiled wet zones and suitable wall finishes.');
  if (input.vanity === 'custom' || input.customStorage) savings.push('Compare standard joinery dimensions with bespoke cabinetry.');
  if (input.finish === 'premium') savings.push('Prioritise premium finishes at focal points and compare simpler selections elsewhere.');
  if (input.underfloorHeating || input.featureLighting) savings.push('Separate optional upgrades from the core renovation scope for assessment.');
  if (!savings.length) savings.push('Confirm what can be retained safely after inspection; waterproofing and required work should never be reduced to save scope.');
  return savings;
}

/**
 * @param {object} input
 * @param {typeof RATE_CARD | PricedRateCard} [rateCard]
 */
export function estimateBathroom(input, rateCard = RATE_CARD) {
  const errors = validateInputs(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const area = areaM2(input);
  const w = PLANNING_WEIGHTS;
  const areaPoints = w.areaBands.find((band) => area <= band.maxM2).points;
  const sitePoints = SITE_FLAGS.filter((flag) => input[flag] === true).length;
  const scopeScore = w.renovationType[input.renovationType] + w.finish[input.finish] + w.plumbing[input.plumbing] + areaPoints + sitePoints + extraComplexity(input);
  const level = LEVELS.find((l) => scopeScore <= l.max);
  const base = { ok: true, areaM2: area, scopeScore, level: level.id, levelLabel: level.label, drivers: driversFor(input), savings: savingsFor(input), timeline: 'Construction duration is confirmed after site inspection, scope, product availability and approvals. No approved duration assumptions are currently available.', exclusions: ['Hidden damage, hazardous materials and substrate conditions require inspection.', 'Engineering, strata or statutory approvals may be required.', 'Product availability, lead times and service upgrades remain unconfirmed.'] };

  if (!rateCard?.approved) return { ...base, mode: 'planning' };

  const rate = rateCard.perM2?.[input.renovationType]?.[input.finish];
  if (typeof rate !== 'number') throw new Error('Approved rate card is missing a rate for this combination.');
  if (!rateCard.version || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(rateCard.roundTo) || rateCard.roundTo <= 0 || !Number.isFinite(rateCard.rangePct) || rateCard.rangePct < 0 || rateCard.rangePct >= 1) throw new Error('Approved rate card has invalid configuration.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rateCard.sourceDate ?? '') || !['inclusive', 'exclusive'].includes(rateCard.gstTreatment) || !Array.isArray(rateCard.assumptions) || !rateCard.assumptions.length || !Array.isArray(rateCard.exclusions)) throw new Error('Approved rate card requires a source date, GST treatment, assumptions and exclusions.');
  const amount = (value) => {
    if (!Number.isFinite(value) || value < 0) throw new Error('Approved rate card is missing a valid adjustment.');
    return value;
  };
  let adjustments = 0;
  for (const key of Object.keys(PLANNER_CHOICES)) {
    if (input[key] !== undefined && key !== 'timeframe') adjustments += amount(rateCard.adjustments?.[key]?.[input[key]]);
  }
  for (const key of ['underfloorHeating', 'featureLighting', 'customStorage']) if (input[key]) adjustments += amount(rateCard.flat?.[key]);
  const flat = SITE_FLAGS.filter((flag) => input[flag] === true).reduce((sum, flag) => sum + (rateCard.flat?.[flag] ?? 0), 0);
  SITE_FLAGS.filter((flag) => input[flag] === true).forEach((flag) => amount(rateCard.flat?.[flag]));
  const subtotal = area * rate + amount(rateCard.plumbing?.[input.plumbing]) + flat + adjustments;
  const round = (n) => Math.round(n / rateCard.roundTo) * rateCard.roundTo;
  return {
    ...base,
    mode: 'priced',
    rateCardVersion: rateCard.version,
    sourceDate: rateCard.sourceDate, gstTreatment: rateCard.gstTreatment,
    pricingAssumptions: rateCard.assumptions, pricingExclusions: rateCard.exclusions,
    lowAud: round(subtotal * (1 - rateCard.rangePct)),
    highAud: round(subtotal * (1 + rateCard.rangePct)),
  };
}

/** Compare relative complexity only; these scores are never monetary rates. */
export function compareScenarios(input) {
  if (Object.keys(validateInputs(input)).length) return [];
  return [
    { title: 'Your selected scope', input },
    { title: 'Retain service positions', input: { ...input, plumbing: 'none', structural: 'none', renovationType: input.renovationType === 'refresh' ? 'refresh' : 'full_refit' } },
    { title: 'Simplify finishes and extras', input: { ...input, finish: 'essential', vanity: 'single', customStorage: false, underfloorHeating: false, featureLighting: false, tiling: 'wet_zones' } },
  ].map((scenario) => ({ title: scenario.title, ...estimateBathroom(scenario.input) }));
}

/** Query string that pre-fills the questionnaire from calculator inputs (whitelisted values only). */
export function toQuestionnaireParams(input) {
  const finish = { essential: 'essential', mid_range: 'mid_range', premium: 'premium' }[input.finish];
  const layout = { refresh: 'none', full_refit: 'minor', full_refit_layout: 'major' }[input.renovationType];
  const size = areaM2(input) <= 4 ? 'small' : areaM2(input) <= 8 ? 'medium' : 'large';
  const params = new URLSearchParams({ category: 'bathroom', from: 'calculator', finish, layout, size });
  if (input.plumbing !== 'none') params.set('plumbing', '1');
  const planner = {};
  const choices = { ...PLANNER_CHOICES, renovationType: RENOVATION_TYPES, finish: FINISH_LEVELS, plumbing: PLUMBING_CHANGES };
  for (const [key, values] of Object.entries(choices)) if (values.includes(input[key])) planner[key] = input[key];
  for (const key of PLANNER_FLAGS) if (typeof input[key] === 'boolean') planner[key] = input[key];
  for (const [key, max] of [['lengthM', 10], ['widthM', 10], ['areaInputM2', 100]]) {
    if (typeof input[key] === 'number' && Number.isFinite(input[key]) && input[key] >= 1 && input[key] <= max) planner[key] = input[key];
  }
  params.set('planner', JSON.stringify(planner));
  return params.toString();
}
