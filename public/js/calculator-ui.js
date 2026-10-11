import { ESTIMATE_FLAGS, BATHROOM_SIZES, TIERS_LABELS } from './lib/pricing-config.js';
import { estimateProject, estimateHandoffQuery, formatAud, formatRange } from './lib/price-estimate.js';
import { loadPlanningContext, savePlanningContext } from './lib/planning-context.js';

const form = document.querySelector('[data-calculator]');
const output = document.querySelector('#calc-result [data-result]');
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const list = (items, className = 'calc-list') => {
  const ul = el('ul', undefined, className);
  items.forEach((text) => ul.append(el('li', text)));
  return ul;
};
const signed = (n) => `${n < 0 ? '−' : '+'}${formatAud(Math.abs(n))}`;
const itemAmount = (i) => (i.low === i.high ? signed(i.low) : `${signed(i.low)} to ${signed(i.high).slice(1)}`);

const PROJECT_LABEL = { bathroom: 'Bathroom', kitchen: 'Kitchen' };
const VALUE_LABEL = {
  concrete: 'Concrete slab', timber: 'Timber or stumps', ground: 'Ground access', apartment: 'Apartment',
  supply_install: 'Milestone supplies and installs', own_supply: 'You supply some items',
};
const FLAG_LABEL = { layoutChange: 'Layout change', wallRemoval: 'Wall removal', recessedNiche: 'Recessed niche', diyDemolition: 'You demolish', olderHome: 'Older home' };

function init() {
  const sections = [...form.querySelectorAll('[data-for]')];

  function read() {
    const data = new FormData(form);
    const project = String(data.get('project') ?? 'bathroom');
    const input = { project, finish: String(data.get('finish') ?? ''), supply: String(data.get('supply') ?? 'supply_install') };
    if (project === 'bathroom') {
      for (const key of ['size', 'floor', 'access']) input[key] = String(data.get(key) ?? '');
    }
    for (const key of ESTIMATE_FLAGS) if (form.elements.namedItem(key) && !(project === 'kitchen' && !['layoutChange', 'wallRemoval'].includes(key))) {
      input[key] = [...form.querySelectorAll(`input[name="${key}"]`)].some((box) => !box.disabled && box.checked);
    }
    return input;
  }

  function applyProject(project) {
    for (const node of sections) {
      const show = node.dataset.for === project;
      node.hidden = !show;
      node.querySelectorAll('input').forEach((input) => { input.disabled = !show; });
      if (node.matches('input')) node.disabled = !show;
    }
  }

  function summaryRows(input) {
    const rows = [['Project', PROJECT_LABEL[input.project]], ['Finish', TIERS_LABELS[input.finish]]];
    if (input.project === 'bathroom') {
      rows.push(['Size', `${BATHROOM_SIZES[input.size].label} (${BATHROOM_SIZES[input.size].area})`], ['Floor', VALUE_LABEL[input.floor]], ['Access', VALUE_LABEL[input.access]]);
    }
    rows.push(['Fixtures and finishes', VALUE_LABEL[input.supply]]);
    const chosen = ESTIMATE_FLAGS.filter((flag) => input[flag]).map((flag) => FLAG_LABEL[flag]);
    rows.push(['Options', chosen.length ? chosen.join(', ') : 'None selected']);
    return rows;
  }

  function render() {
    const input = read();
    const result = estimateProject(input);
    output.replaceChildren();
    if (!result.ok) {
      bar.textContent = 'Choose an option in each step';
      output.append(el('p', 'Choose an option in each step to see your estimate.', 'calc-loading'));
      return;
    }
    try { savePlanningContext(sessionStorage, { estimate: input }); } catch { /* The estimate works without browser storage. */ }

    bar.textContent = `Estimate ${formatRange(result)} ↓`;
    output.append(el('p', 'YOUR INDICATIVE ESTIMATE', 'calc-eyebrow'));
    const range = el('p', formatRange(result), 'calc-range');
    range.id = 'calc-range';
    output.append(range);
    output.append(el('p', `${result.gstNote.split('.')[0]} · Sydney 2026 benchmarks · reviewed ${result.reviewed}`, 'calc-range-meta'));

    const time = el('div', undefined, 'calc-time');
    time.append(el('p', 'Estimated timeline', 'calc-block-title'));
    time.append(el('p', `On site: ${result.onSiteLabel}`, 'calc-time-main'));
    if (result.overallLabel) time.append(el('p', `Design sign-off to completion: ${result.overallLabel}`, 'calc-time-sub'));
    if (result.beforeStartWeeksMax) time.append(el('p', `Allow up to ${result.beforeStartWeeksMax} weeks before work starts: ${result.beforeStartReasons.join('; ')}.`, 'calc-time-sub'));
    output.append(time);

    output.append(el('p', 'Your selections', 'calc-block-title'));
    const dl = el('dl', undefined, 'calc-dl');
    summaryRows(input).forEach(([k, v]) => { dl.append(el('dt', k), el('dd', v)); });
    output.append(dl);

    output.append(el('p', 'What drives this range', 'calc-block-title'));
    const drivers = el('ul', undefined, 'calc-drivers-list');
    result.lineItems.forEach((item) => {
      const li = el('li');
      const head = el('span', undefined, 'calc-driver-head');
      head.append(el('span', item.label, 'calc-driver-label'));
      head.append(el('span', item.id === 'base' ? `${formatAud(item.low)} to ${formatAud(item.high)}` : itemAmount(item), 'calc-driver-amount'));
      li.append(head);
      li.append(el('span', item.basis === 'source' ? 'Published figure' : 'Planning allowance', `calc-basis calc-basis-${item.basis}`));
      drivers.append(li);
    });
    output.append(drivers);
    if (result.unpricedScope.length) output.append(list(result.unpricedScope, 'calc-list calc-list-warn'));
    if (result.ownSupplyNotice) output.append(el('p', result.ownSupplyNotice, 'calc-callout'));

    const details = el('details', undefined, 'calc-details');
    details.append(el('summary', 'Included, excluded and contingency'));
    details.append(el('p', 'Included', 'calc-block-title'), list(result.inclusions));
    details.append(el('p', 'Not included', 'calc-block-title'), list(result.exclusions));
    details.append(el('p', 'Contingency', 'calc-block-title'), el('p', result.contingency, 'calc-small'));
    output.append(details);

    output.append(el('p', 'This is an indicative market range, not a quote. Actual costs depend on inspection, plans, selections, site conditions and a written quotation.', 'calc-disclaimer'));
    const links = el('p', undefined, 'calc-small');
    const how = el('a', 'How this is calculated'); how.href = '#how-it-works';
    const dis = el('a', 'Cost estimate disclaimer'); dis.href = '/estimate-disclaimer';
    links.append(how, document.createTextNode(' · '), dis);
    output.append(links);

    const actions = el('div', undefined, 'cc-actions');
    const cta = el('a', 'Request a detailed quote ↗', 'btn btn-gold');
    cta.href = `/plan-your-renovation?${estimateHandoffQuery(input)}`;
    const print = el('button', 'Print estimate', 'cc-print');
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    actions.append(cta, print);
    output.append(actions);
    announce(`${PROJECT_LABEL[input.project]} estimate ${formatRange(result)} including GST`);
  }

  const live = el('p', undefined, 'sr-only');
  live.setAttribute('role', 'status');
  form.append(live);
  // Compact sticky range for narrow screens, where the full summary sits below the controls.
  const bar = el('a', undefined, 'cc-live');
  bar.href = '#calc-result';
  bar.setAttribute('aria-label', 'Jump to your full estimate');
  form.prepend(bar);
  let announceTimer;
  function announce(text) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { live.textContent = text; }, 400);
  }

  function setValue(name, value) {
    const control = [...form.querySelectorAll(`input[name="${name}"]`)];
    for (const input of control) {
      if (input.type === 'checkbox') input.checked = value === true;
      else input.checked = input.value === value;
    }
  }

  function restore() {
    const params = new URLSearchParams(location.search);
    let saved;
    try { saved = loadPlanningContext(sessionStorage)?.estimate; } catch { saved = undefined; }
    if (saved) for (const [key, value] of Object.entries(saved)) setValue(key, value);
    const requested = params.get('project');
    if (['bathroom', 'kitchen'].includes(requested)) setValue('project', requested);
  }

  // Keep the duplicated layout/wall toggles in sync when the project changes.
  const syncPairs = (project) => {
    for (const name of ['layoutChange', 'wallRemoval']) {
      const boxes = [...form.querySelectorAll(`input[name="${name}"]`)];
      const checked = boxes.some((b) => b.checked);
      boxes.forEach((b) => { b.checked = checked; });
    }
    applyProject(project);
  };

  form.addEventListener('change', (event) => {
    if (event.target.name === 'project') syncPairs(event.target.value);
    render();
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  restore();
  syncPairs(read().project);
  render();
}

if (form && output) init();
