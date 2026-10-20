import { BATHROOM_MODEL } from '../public/js/lib/bathroom-calculator.js';
// Prints the pricing configuration as JSON so build_site.py renders the public methodology from the same
// single source of truth the calculator uses. Run by build_site.py; no arguments.
import * as config from '../public/js/lib/pricing-config.js';
import { tierRange, formatAud } from '../public/js/lib/price-estimate.js';

const tiers = {};
for (const project of Object.keys(config.TIER_SOURCES)) {
  tiers[project] = {};
  for (const finish of config.FINISH_IDS) {
    const t = tierRange(project, finish);
    tiers[project][finish] = { rows: t.rows, mean: { low: t.low, high: t.high }, meanLabel: `${formatAud(t.low)} – ${formatAud(t.high)}` };
  }
}
process.stdout.write(JSON.stringify({
  bathroomModel: BATHROOM_MODEL, version: config.PRICING_VERSION, reviewed: config.PRICING_REVIEWED, gst: config.GST, sources: config.SOURCES, tiers,
  timelines: config.TIMELINES, tierLabels: config.TIERS_LABELS,
  contingency: config.CONTINGENCY, quoteOnly: config.QUOTE_ONLY_PROJECTS,
}));
