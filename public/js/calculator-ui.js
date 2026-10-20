// Kitchen market guide only. Bathroom pricing lives in bathroom-calculator.js.
import { estimateProject, estimateHandoffQuery, formatRange } from './lib/price-estimate.js';
const form = document.querySelector('[data-kitchen-calculator]');
if (form) {
  const update = () => {
    const data = new FormData(form);
    const input = { project: 'kitchen', finish: data.get('finish'), layoutChange: data.has('layoutChange'), wallRemoval: data.has('wallRemoval'), supply: data.has('ownSupply') ? 'own_supply' : 'supply_install' };
    const result = estimateProject(input);
    const summary = document.querySelector('[data-kitchen-result]');
    summary.replaceChildren();
    for (const text of [formatRange(result), result.onSiteLabel + ' on site', 'Indicative market range, including GST; not a quotation.', ...result.unpricedScope, result.ownSupplyNotice].filter(Boolean)) {
      const p = document.createElement('p'); p.textContent = text; summary.append(p);
    }
    const link = document.createElement('a'); link.className = 'btn btn-gold'; link.textContent = 'Request a detailed quote'; link.href = '/plan-your-renovation?' + estimateHandoffQuery(input); summary.append(link);
  };
  form.addEventListener('change', update); update();
}
