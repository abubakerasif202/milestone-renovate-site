// Indicative renovation pricing configuration (Sydney, 2026, AUD).
//
// IMPORTANT: these are INDICATIVE MARKET BENCHMARKS compiled from published guides. They are NOT approved
// Milestone Renovate rates or quotes. Every number below is either
//   basis: 'source'      - taken from, or arithmetically derived from, a cited published figure, or
//   basis: 'assumption'  - a Milestone planning allowance with no published figure behind it. These are
//                          shown to users as "planning allowance" and must be calibrated against real quotes.
// Method and source notes: docs/PRICING-METHODOLOGY.md. Change numbers here only, then re-run the tests.

/** @typedef {'source'|'assumption'} Basis */
/** @typedef {{id:string,title:string,url:string,date:string,gst:string,note?:string}} PricingSource */
/** @typedef {{low:number,high:number,basis:Basis,source?:string,note:string}} Allowance */

export const PRICING_VERSION = '2026-10-12';
export const PRICING_REVIEWED = '12 October 2026';
export const GST = Object.freeze({ treatment: 'inclusive', note: 'All ranges include GST. GST is not added again.' });
export const ROUND_TO = 500;
export const SANITY_FLOOR_AUD = 5000; // guards against nonsensical output; never a price

/** @type {readonly PricingSource[]} */
export const SOURCES = Object.freeze([
  { id: 'wtd-bath', title: "What's the Damage: Sydney bathroom renovation cost 2026", url: 'https://whatsthedamage.com.au/bathroom-renovation-cost-sydney/', date: 'Verified October 2026', gst: 'Includes GST', note: 'Independent aggregator of published cost guides, marketplaces and trade rate data.' },
  { id: 'wtd-kitchen', title: "What's the Damage: Sydney kitchen renovation cost 2026", url: 'https://whatsthedamage.com.au/kitchen-renovation-cost-sydney/', date: 'Verified October 2026', gst: 'Includes GST' },
  { id: 'wtd-breakdown', title: "What's the Damage: Sydney bathroom cost breakdown", url: 'https://whatsthedamage.com.au/bathroom-renovation-cost-sydney/cost-breakdown/', date: 'Updated October 2026', gst: 'Not stated' },
  { id: 'mh-guide', title: 'Martina Hayes: Renovation cost Sydney 2026', url: 'https://www.martinahayes.com.au/renovation-cost-sydney/', date: '13 July 2026', gst: 'Includes GST', note: 'Sydney builder guide. Bathroom and kitchen tiers include supply of tiles, fixtures and cabinetry; kitchen appliances are extra.' },
  { id: 'tfo', title: 'TFO: How much does a bathroom renovation cost in 2026', url: 'https://www.tfo.com.au/post/bathroom-renovation-cost/', date: '2026', gst: 'Not stated' },
  { id: 'wtd-report', title: "What's the Damage: Annual Report June 2026", url: 'https://whatsthedamage.com.au/report/australian-renovation-market-2026/', date: 'June 2026', gst: 'Not stated' },
  { id: 'cylex-hidden', title: 'Hidden costs in a Sydney bathroom renovation (Cylex)', url: 'https://www.cylex-australia.com/mb9-australia-pty-ltd-25179424/articles/what-are-the-hidden-costs-in-a-sydney-bathroom-renovation-2643290/', date: '2026', gst: 'Not stated', note: 'Older homes can cost $1,500-$4,000 more than expected; lists strata, lift, acoustic and working-hours extras.' },
]);

/**
 * Tier ranges as published by two independent Sydney sources. Milestone's base range for each tier is the
 * equal-weight average of the published lows and of the published highs (see tierRange in price-estimate.js).
 * The aggregator (wtd-*) and the builder guide (mh-guide) differ materially; averaging avoids leaning on either.
 */
export const TIER_SOURCES = Object.freeze({
  bathroom: {
    essential: [{ src: 'wtd-bath', label: 'Basic', low: 11500, high: 23000 }, { src: 'mh-guide', label: 'Basic', low: 25000, high: 30000 }],
    mid_range: [{ src: 'wtd-bath', label: 'Mid-range', low: 23000, high: 40250 }, { src: 'mh-guide', label: 'Mid-range', low: 30000, high: 45000 }],
    premium: [{ src: 'wtd-bath', label: 'Premium', low: 40250, high: 63250 }, { src: 'mh-guide', label: 'High end', low: 45000, high: 90000 }],
  },
  kitchen: {
    essential: [{ src: 'wtd-kitchen', label: 'Budget (flat-pack)', low: 13800, high: 28750 }, { src: 'mh-guide', label: 'Basic', low: 28000, high: 45000 }],
    mid_range: [{ src: 'wtd-kitchen', label: 'Mid-range', low: 28750, high: 51750 }, { src: 'mh-guide', label: 'Mid-range', low: 45000, high: 75000 }],
    premium: [{ src: 'wtd-kitchen', label: 'Premium', low: 51750, high: 92000 }, { src: 'mh-guide', label: 'High end', low: 75000, high: 130000 }],
  },
});

/** Bathroom size multipliers applied to the base (medium) range. */
export const BATHROOM_SIZES = Object.freeze({
  small: { label: 'Small', area: 'Up to 4 m²', factor: 0.75, basis: 'source', source: 'wtd-bath', note: 'Ensuite-sized rooms (3-5 m²) are published as typically 20-30% cheaper than main bathrooms; the 25% midpoint is used.' },
  medium: { label: 'Medium', area: '4 to 8 m²', factor: 1, basis: 'source', source: 'wtd-bath', note: 'Published tiers describe a standard main bathroom of roughly 4-6 m², used as the base.' },
  large: { label: 'Large', area: 'Over 8 m²', factor: 1.2, basis: 'assumption', note: 'No published large-bathroom tier exists. Published per-m² rates fall as rooms get larger, so cost rises more slowly than area; 1.2 is a planning assumption.' },
});

/** @type {Record<string, Allowance>} Additive allowances (AUD, incl. GST) for the bathroom estimate. */
export const BATHROOM_ADJUSTMENTS = Object.freeze({
  layoutChange: { low: 2000, high: 7000, basis: 'source', source: 'tfo', note: 'Relocating plumbing for a vanity, shower or toilet: $3,000-$7,000+ (TFO 2026) and $2,000-$6,000 (WTD 2026 report).' },
  wallRemoval: { low: 1500, high: 6000, basis: 'assumption', note: 'Removing a wall needs a structural assessment first. No published bathroom figure; this is a planning allowance.' },
  recessedNiche: { low: 300, high: 1000, basis: 'assumption', note: 'A prefabricated niche costs about $165 plus tiling and waterproofing labour. No Australian installed price was found; planning allowance.' },
  apartment: { low: 1000, high: 3000, basis: 'assumption', source: 'cylex-hidden', note: 'Strata approvals, lift protection, acoustic and working-hours extras are listed but not priced by sources. Planning allowance.' },
  timberFloor: { low: 500, high: 2500, basis: 'assumption', note: 'Timber or bearer floors need assessment and substrate preparation for wet areas. Planning allowance.' },
  olderHome: { low: 1500, high: 4000, basis: 'source', source: 'cylex-hidden', note: 'Older bathrooms often cost $1,500-$4,000 more than expected once opened up.' },
  diyDemolition: { low: -2300, high: -2300, basis: 'source', source: 'wtd-breakdown', note: 'Demolition and disposal is published at $1,150-$3,450; the $2,300 midpoint is removed. Asbestos and licensed disposal rules still apply.' },
});

export const TIMELINES = Object.freeze({
  bathroom: {
    onSiteWeeks: [3, 6], basis: 'source', source: 'wtd-bath',
    note: 'Published as 3-6 weeks from demolition to completion. Waterproofing needs at least 72 hours to cure.',
    beforeStart: { premium: { weeks: 8, reason: 'custom vanities and imported tiles can add 4-8 weeks of lead time' }, apartment: { weeks: 8, reason: 'strata approval can add 4-8 weeks before work starts' } },
  },
  kitchen: {
    onSiteWeeks: [2, 3], overallWeeks: [10, 14], basis: 'source', source: 'wtd-kitchen',
    note: 'Mid-range: 10-14 weeks from design sign-off to completion, of which 2-3 weeks on site; cabinetry manufacture is the long lead item.',
    beforeStart: {},
  },
});

export const CONTINGENCY = Object.freeze({
  included: false,
  note: 'Ranges do not include a contingency allowance. Sources advise a good builder flags risk and allows for it upfront; older homes in particular can cost $1,500-$4,000 more than expected.',
});

export const INCLUSIONS = Object.freeze({
  bathroom: ['Demolition and disposal', 'Waterproofing, plumbing and electrical', 'Tiling, vanity and shower screen', 'Supply and installation by licensed trades'],
  kitchen: ['Custom cabinetry, benchtops and splashback', 'Sink and tapware', 'Installation by licensed trades'],
});

export const EXCLUSIONS = Object.freeze({
  bathroom: ['Design, engineering, council or certifier fees', 'Asbestos or hazardous material removal', 'Structural or services upgrades beyond those selected', 'Contingency for hidden conditions'],
  kitchen: ['Appliances (fridge, cooktop, oven, dishwasher, rangehood)', 'Design, engineering, council or certifier fees', 'Asbestos or hazardous material removal', 'Contingency for hidden conditions'],
});

/** Projects where published pricing is too thin to estimate; the calculator routes these to a detailed quote. */
export const QUOTE_ONLY_PROJECTS = Object.freeze({
  whole_home: 'Whole-home renovations vary too widely for a reliable online range (only one published Sydney figure was found).',
  extension: 'No published Sydney extension pricing was found that is specific enough to estimate responsibly.',
});

export const FINISH_IDS = Object.freeze(['essential', 'mid_range', 'premium']);
export const ESTIMATE_CHOICES = Object.freeze({
  project: ['bathroom', 'kitchen'],
  finish: FINISH_IDS,
  size: ['small', 'medium', 'large'],
  floor: ['concrete', 'timber'],
  access: ['ground', 'apartment'],
  supply: ['supply_install', 'own_supply'],
});
export const ESTIMATE_FLAGS = Object.freeze(['layoutChange', 'wallRemoval', 'recessedNiche', 'diyDemolition', 'olderHome']);

export const TIERS_LABELS = Object.freeze({ essential: 'Standard', mid_range: 'Mid-range', premium: 'Premium' });

/**
 * Published bathroom line items (Sydney 2026, wtd-breakdown). Used only to show the indicative SHARE of a
 * typical bathroom budget; electrical and project management are not priced by the source and are excluded.
 */
export const BATHROOM_BREAKDOWN = Object.freeze({
  source: 'wtd-breakdown',
  items: Object.freeze([
    { id: 'tiling', label: 'Tiling', low: 3225, high: 8600 },
    { id: 'plumbing', label: 'Plumbing rough-in', low: 2300, high: 5750 },
    { id: 'waterproofing', label: 'Waterproofing', low: 805, high: 4025 },
    { id: 'demolition', label: 'Demolition and disposal', low: 1150, high: 3450 },
    { id: 'vanity', label: 'Vanity', low: 575, high: 4025 },
    { id: 'screen', label: 'Shower screen', low: 920, high: 2875 },
  ]),
});
export const SCALE_MAX_AUD = 120000; // visual scale for the range bar only
