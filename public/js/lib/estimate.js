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

/** Unitless complexity points used only for the planning profile. */
export const PLANNING_WEIGHTS = Object.freeze({
  renovationType: { refresh: 1, full_refit: 3, full_refit_layout: 4 },
  finish: { essential: 0, mid_range: 1, premium: 2 },
  plumbing: { none: 0, minor: 1, major: 2 },
  site: { accessibility: 1, strata: 1, olderHome: 1, limitedAccess: 1 },
  areaBands: [{ maxM2: 4, points: 0 }, { maxM2: 8, points: 1 }, { maxM2: Infinity, points: 2 }],
});

/** @typedef {{approved:true, version:string, roundTo:number, rangePct:number, perM2:Record<string,Record<string,number>>, plumbing:Record<string,number>, flat:Record<string,number>}} PricedRateCard */
export const RATE_CARD = Object.freeze({ approved: false });

export const LEVELS = [
  { max: 3, id: 'light', label: 'Light scope' },
  { max: 6, id: 'moderate', label: 'Moderate scope' },
  { max: 9, id: 'substantial', label: 'Substantial scope' },
  { max: Infinity, id: 'complex', label: 'Complex scope' },
];

const LIMITS = { minSide: 1, maxSide: 10 };

export function validateInputs(input) {
  const errors = {};
  for (const key of ['lengthM', 'widthM']) {
    const value = Number(input?.[key]);
    if (!Number.isFinite(value) || value < LIMITS.minSide || value > LIMITS.maxSide) {
      errors[key] = `Enter a measurement between ${LIMITS.minSide} and ${LIMITS.maxSide} metres.`;
    }
  }
  if (!RENOVATION_TYPES.includes(input?.renovationType)) errors.renovationType = 'Choose the type of renovation.';
  if (!FINISH_LEVELS.includes(input?.finish)) errors.finish = 'Choose a finish level.';
  if (!PLUMBING_CHANGES.includes(input?.plumbing)) errors.plumbing = 'Choose the plumbing changes expected.';
  return errors;
}

export const areaM2 = (input) => Math.round(Number(input.lengthM) * Number(input.widthM) * 10) / 10;

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
  return drivers;
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
  const scopeScore = w.renovationType[input.renovationType] + w.finish[input.finish] + w.plumbing[input.plumbing] + areaPoints + sitePoints;
  const level = LEVELS.find((l) => scopeScore <= l.max);
  const base = { ok: true, areaM2: area, scopeScore, level: level.id, levelLabel: level.label, drivers: driversFor(input) };

  if (!rateCard?.approved) return { ...base, mode: 'planning' };

  const rate = rateCard.perM2?.[input.renovationType]?.[input.finish];
  if (typeof rate !== 'number') throw new Error('Approved rate card is missing a rate for this combination.');
  const flat = SITE_FLAGS.filter((flag) => input[flag] === true).reduce((sum, flag) => sum + (rateCard.flat?.[flag] ?? 0), 0);
  const subtotal = area * rate + (rateCard.plumbing?.[input.plumbing] ?? 0) + flat;
  const round = (n) => Math.round(n / rateCard.roundTo) * rateCard.roundTo;
  return {
    ...base,
    mode: 'priced',
    rateCardVersion: rateCard.version,
    lowAud: round(subtotal * (1 - rateCard.rangePct)),
    highAud: round(subtotal * (1 + rateCard.rangePct)),
  };
}

/** Query string that pre-fills the questionnaire from calculator inputs (whitelisted values only). */
export function toQuestionnaireParams(input) {
  const finish = { essential: 'essential', mid_range: 'mid_range', premium: 'premium' }[input.finish];
  const layout = { refresh: 'none', full_refit: 'minor', full_refit_layout: 'major' }[input.renovationType];
  const size = areaM2(input) <= 4 ? 'small' : areaM2(input) <= 8 ? 'medium' : 'large';
  const params = new URLSearchParams({ category: 'bathroom', from: 'calculator', finish, layout, size });
  if (input.plumbing !== 'none') params.set('plumbing', '1');
  return params.toString();
}
