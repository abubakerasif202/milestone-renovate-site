// Indicative price estimator. Pure and deterministic: the same code runs in the browser (live results) and on
// the server (staff notification), so the range an enquirer saw is the range staff see. All numbers come from
// pricing-config.js. See docs/PRICING-METHODOLOGY.md.
import {
  BATHROOM_ADJUSTMENTS, BATHROOM_SIZES, CONTINGENCY, ESTIMATE_CHOICES, ESTIMATE_FLAGS, EXCLUSIONS, GST, INCLUSIONS,
  PRICING_REVIEWED, PRICING_VERSION, ROUND_TO, SANITY_FLOOR_AUD, SOURCES, TIERS_LABELS, TIMELINES, TIER_SOURCES,
} from './pricing-config.js';

const sourceById = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
export const sourceFor = (id) => sourceById[id];

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Base (unadjusted) range for a project tier: equal-weight mean of published lows and of published highs. */
export function tierRange(project, finish) {
  const rows = TIER_SOURCES[project]?.[finish];
  if (!rows) throw new Error(`No published tier data for ${project}/${finish}`);
  return { low: mean(rows.map((r) => r.low)), high: mean(rows.map((r) => r.high)), rows };
}

const roundDown = (n) => Math.floor(n / ROUND_TO) * ROUND_TO;
const roundUp = (n) => Math.ceil(n / ROUND_TO) * ROUND_TO;

export function validateEstimateInput(input) {
  const errors = {};
  if (input === null || typeof input !== 'object') return { project: 'Choose a project type.' };
  if (!ESTIMATE_CHOICES.project.includes(input.project)) errors.project = 'Choose a project type.';
  if (!ESTIMATE_CHOICES.finish.includes(input.finish)) errors.finish = 'Choose a finish level.';
  if (input.project === 'bathroom') {
    for (const key of ['size', 'floor', 'access']) if (!ESTIMATE_CHOICES[key].includes(input[key])) errors[key] = 'Choose one of the options.';
  }
  if (input.supply !== undefined && !ESTIMATE_CHOICES.supply.includes(input.supply)) errors.supply = 'Choose one of the options.';
  for (const key of ESTIMATE_FLAGS) if (input[key] !== undefined && typeof input[key] !== 'boolean') errors[key] = 'Choose a valid option.';
  return errors;
}

const weeksLabel = ([a, b]) => (a === b ? `${a} weeks` : `${a}-${b} weeks`);

function bathroomBuild(input, base) {
  const size = BATHROOM_SIZES[input.size];
  let low = base.low * size.factor;
  let high = base.high * size.factor;
  const items = [{ id: 'base', label: `${TIERS_LABELS[input.finish]} bathroom, ${size.label.toLowerCase()} (${size.area})`, low: Math.round(low / 100) * 100, high: Math.round(high / 100) * 100, basis: size.basis, note: size.note }];
  const add = (id, label, adj) => {
    low += adj.low; high += adj.high;
    items.push({ id, label, low: adj.low, high: adj.high, basis: adj.basis, source: adj.source, note: adj.note });
  };
  if (input.layoutChange) add('layoutChange', 'Layout change / plumbing relocation', BATHROOM_ADJUSTMENTS.layoutChange);
  if (input.wallRemoval) add('wallRemoval', 'Wall removal', BATHROOM_ADJUSTMENTS.wallRemoval);
  if (input.recessedNiche) add('recessedNiche', 'Recessed shower niche', BATHROOM_ADJUSTMENTS.recessedNiche);
  if (input.access === 'apartment') add('apartment', 'Apartment access and strata', BATHROOM_ADJUSTMENTS.apartment);
  if (input.floor === 'timber') add('timberFloor', 'Timber floor preparation', BATHROOM_ADJUSTMENTS.timberFloor);
  if (input.olderHome) add('olderHome', 'Older home: hidden conditions', BATHROOM_ADJUSTMENTS.olderHome);
  if (input.diyDemolition) add('diyDemolition', 'You demolish (saving)', BATHROOM_ADJUSTMENTS.diyDemolition);
  return { low, high, items };
}

/**
 * @param {object} input {project, finish, size?, floor?, access?, supply?, layoutChange?, wallRemoval?, recessedNiche?, diyDemolition?, olderHome?}
 * @returns {{ok:false,errors:Record<string,string>}|object}
 */
export function estimateProject(input) {
  const errors = validateEstimateInput(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const { project } = input;
  const base = tierRange(project, input.finish);
  let low;
  let high;
  let lineItems;
  const unpriced = [];
  if (project === 'bathroom') {
    ({ low, high, items: lineItems } = bathroomBuild(input, base));
  } else {
    low = base.low; high = base.high;
    lineItems = [{ id: 'base', label: `${TIERS_LABELS[input.finish]} kitchen`, low: Math.round(low / 100) * 100, high: Math.round(high / 100) * 100, basis: 'source', note: 'Average of two published Sydney tier ranges. Published kitchen ranges are not split by size or layout.' }];
    if (input.layoutChange) unpriced.push('Layout change: not separately priced in published sources; confirmed in your quote.');
    if (input.wallRemoval) unpriced.push('Wall removal: not separately priced in published sources; needs a structural assessment.');
  }

  low = Math.max(low, SANITY_FLOOR_AUD);
  high = Math.max(high, low);
  const lowAud = roundDown(low);
  const highAud = roundUp(high);
  if (![lowAud, highAud].every((n) => Number.isFinite(n) && n > 0) || lowAud > highAud) throw new Error('Estimate produced an invalid range');

  const timeline = TIMELINES[project];
  const lead = Object.entries(timeline.beforeStart)
    .filter(([key]) => (key === 'premium' ? input.finish === 'premium' : key === 'apartment' ? input.access === 'apartment' : false));
  const beforeStartWeeksMax = lead.reduce((m, [, v]) => Math.max(m, v.weeks), 0);
  const assumptionsUsed = lineItems.filter((i) => i.basis === 'assumption').map((i) => ({ id: i.id, label: i.label, note: i.note }));

  return {
    ok: true,
    project,
    pricingVersion: PRICING_VERSION,
    reviewed: PRICING_REVIEWED,
    gst: GST.treatment,
    gstNote: GST.note,
    lowAud,
    highAud,
    onSiteWeeks: timeline.onSiteWeeks,
    onSiteLabel: weeksLabel(timeline.onSiteWeeks),
    overallWeeks: timeline.overallWeeks ?? null,
    overallLabel: timeline.overallWeeks ? weeksLabel(timeline.overallWeeks) : null,
    beforeStartWeeksMax,
    beforeStartReasons: lead.map(([, v]) => v.reason),
    timelineNote: timeline.note,
    lineItems,
    unpricedScope: unpriced,
    assumptionsUsed,
    ownSupplyNotice: input.supply === 'own_supply' ? 'You plan to supply your own fixtures and finishes. Labour-only pricing is not estimated here; the range shown is for supply and installation. We would quote labour-only separately.' : null,
    inclusions: INCLUSIONS[project],
    exclusions: EXCLUSIONS[project],
    contingency: CONTINGENCY.note,
    tierRows: base.rows,
  };
}

export const formatAud = (n) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
export const formatRange = (r) => `${formatAud(r.lowAud)} – ${formatAud(r.highAud)}`;

/** Query string that carries the complete calculator selection into the enquiry questionnaire (whitelisted values only). */
export function estimateHandoffQuery(input) {
  const params = new URLSearchParams({ category: input.project, from: 'calculator', finish: input.finish });
  const estimate = { project: input.project, finish: input.finish };
  for (const key of Object.keys(ESTIMATE_CHOICES)) if (ESTIMATE_CHOICES[key].includes(input[key])) estimate[key] = input[key];
  for (const key of ESTIMATE_FLAGS) if (typeof input[key] === 'boolean') estimate[key] = input[key];
  if (input.project === 'bathroom') params.set('size', estimate.size);
  params.set('layout', input.layoutChange || input.wallRemoval ? 'major' : 'none');
  if (input.project === 'bathroom' && input.layoutChange) params.set('plumbing', '1');
  params.set('estimate', JSON.stringify(estimate));
  return params.toString();
}
