import { ESTIMATE_FLAGS, BATHROOM_SIZES, BATHROOM_BREAKDOWN, SCALE_MAX_AUD, TIERS_LABELS } from './lib/pricing-config.js';
import { estimateProject, estimateHandoffQuery, formatAud, formatRange, tierRange } from './lib/price-estimate.js';
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
const pct = (aud) => Math.max(0, Math.min(100, (aud / SCALE_MAX_AUD) * 100));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PROJECT_LABEL = { bathroom: 'Bathroom', kitchen: 'Kitchen' };
const VALUE_LABEL = {
  concrete: 'Concrete slab', timber: 'Timber or stumps', ground: 'Ground access', apartment: 'Apartment',
  supply_install: 'Milestone supplies and installs', own_supply: 'You supply some items',
};
const FLAG_LABEL = { layoutChange: 'Layout change', wallRemoval: 'Wall removal', recessedNiche: 'Recessed niche', diyDemolition: 'You demolish', olderHome: 'Older home' };

/** Persistent summary scaffold: the range text, animated bar and breakdown live here so CSS transitions can run. */
function buildScaffold() {
  output.replaceChildren();
  const eyebrow = el('p', 'YOUR INDICATIVE ESTIMATE', 'calc-eyebrow');
  const range = el('p', undefined, 'calc-range');
  range.id = 'calc-range';
  const meta = el('p', undefined, 'calc-range-meta');

  const scale = el('div', undefined, 'cc-scale');
  scale.setAttribute('role', 'img');
  const track = el('div', undefined, 'cc-scale-track');
  const zones = ['essential', 'mid_range', 'premium'].map((finish, index) => {
    const zone = el('span', undefined, `cc-zone cc-zone-${index + 1}`);
    track.append(zone);
    return { finish, zone };
  });
  const fill = el('span', undefined, 'cc-fill');
  track.append(fill);
  const ticks = el('div', undefined, 'cc-scale-ticks');
  for (const value of [0, SCALE_MAX_AUD / 2, SCALE_MAX_AUD]) ticks.append(el('span', value === 0 ? '$0' : `$${value / 1000}k`));
  const legend = el('p', 'Faint bands show the published Standard, Mid-range and Premium ranges.', 'cc-scale-legend');
  scale.append(track, ticks, legend);

  const breakdown = el('div', undefined, 'cc-breakdown');
  breakdown.append(el('p', 'Where the money typically goes', 'calc-block-title'));
  const total = BATHROOM_BREAKDOWN.items.reduce((sum, i) => sum + (i.low + i.high) / 2, 0);
  const shareOf = (item) => (100 * (item.low + item.high)) / 2 / total;
  const bar = el('div', undefined, 'cc-stack');
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', `Indicative share of published bathroom line items: ${BATHROOM_BREAKDOWN.items.map((i) => `${i.label} ${Math.round(shareOf(i))}%`).join(', ')}`);
  const key = el('ul', undefined, 'cc-stack-key');
  BATHROOM_BREAKDOWN.items.forEach((item, index) => {
    const seg = el('span', undefined, `cc-seg cc-seg-${index + 1}`);
    seg.classList.add(`cc-grow-${Math.max(1, Math.min(40, Math.round(shareOf(item))))}`);
    bar.append(seg);
    const li = el('li');
    li.append(el('span', undefined, `cc-dot cc-seg-${index + 1}`), document.createTextNode(`${item.label} ${Math.round(shareOf(item))}%`));
    key.append(li);
  });
  breakdown.append(bar, key, el('p', 'Indicative share of published line items; electrical and project management are quoted separately.', 'calc-small'));

  const dynamic = el('div', undefined, 'calc-dynamic');
  output.append(eyebrow, range, meta, scale, breakdown, dynamic);
  return { range, meta, scale, zones, fill, breakdown, bar, dynamic };
}

function init() {
  const ui = buildScaffold();
  const sections = [...form.querySelectorAll('[data-for]')];
  let shown = { low: 0, high: 0 };
  let frame = 0;
  let revealed = false;

  function animateRange(target) {
    cancelAnimationFrame(frame);
    const from = { ...shown };
    const done = () => { shown = { low: target.lowAud, high: target.highAud }; ui.range.textContent = formatRange(target); };
    if (reducedMotion() || !revealed) { done(); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 450);
      const eased = 1 - (1 - t) ** 3;
      const low = Math.round((from.low + (target.lowAud - from.low) * eased) / 100) * 100;
      const high = Math.round((from.high + (target.highAud - from.high) * eased) / 100) * 100;
      ui.range.textContent = `${formatAud(low)} – ${formatAud(high)}`;
      if (t < 1) frame = requestAnimationFrame(step); else done();
    };
    frame = requestAnimationFrame(step);
  }

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
    ui.breakdown.hidden = project !== 'bathroom';
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

  /** Positions use pre-generated 1% utility classes so no inline style attributes are ever created. */
  function place(node, lo, width) {
    node.className = node.className.replace(/cc-(lo|w)-\d+/g, '').trim();
    node.classList.add(`cc-lo-${Math.round(lo)}`, `cc-w-${Math.max(1, Math.round(width))}`);
  }

  function updateScale(input, result) {
    for (const { finish, zone } of ui.zones) {
      const t = tierRange(input.project, finish);
      place(zone, pct(t.low), pct(t.high) - pct(t.low));
      zone.classList.toggle('is-active', finish === input.finish);
    }
    place(ui.fill, pct(result.lowAud), pct(result.highAud) - pct(result.lowAud));
    ui.scale.setAttribute('aria-label', `Estimated range ${formatAud(result.lowAud)} to ${formatAud(result.highAud)} on a scale from $0 to ${formatAud(SCALE_MAX_AUD)}`);
  }

  function render() {
    const input = read();
    const result = estimateProject(input);
    ui.dynamic.replaceChildren();
    if (!result.ok) {
      bar.textContent = 'Choose an option in each step';
      ui.range.textContent = '—';
      ui.dynamic.append(el('p', 'Choose an option in each step to see your estimate.', 'calc-loading'));
      return;
    }
    try { savePlanningContext(sessionStorage, { estimate: input }); } catch { /* The estimate works without browser storage. */ }

    bar.textContent = `Estimate ${formatRange(result)} ↓`;
    ui.meta.textContent = `${result.gstNote.split('.')[0]} · Sydney 2026 benchmarks · reviewed ${result.reviewed}`;
    updateScale(input, result);
    animateRange(result);
    if (!revealed) {
      revealed = true;
      requestAnimationFrame(() => { ui.scale.classList.add('is-in'); ui.bar.classList.add('is-in'); });
    }

    const out = ui.dynamic;
    const time = el('div', undefined, 'calc-time');
    time.append(el('p', 'Estimated timeline', 'calc-block-title'));
    time.append(el('p', `On site: ${result.onSiteLabel}`, 'calc-time-main'));
    if (result.overallLabel) time.append(el('p', `Design sign-off to completion: ${result.overallLabel}`, 'calc-time-sub'));
    if (result.beforeStartWeeksMax) time.append(el('p', `Allow up to ${result.beforeStartWeeksMax} weeks before work starts: ${result.beforeStartReasons.join('; ')}.`, 'calc-time-sub'));
    out.append(time);

    out.append(el('p', 'Your selections', 'calc-block-title'));
    const dl = el('dl', undefined, 'calc-dl');
    summaryRows(input).forEach(([k, v]) => { dl.append(el('dt', k), el('dd', v)); });
    out.append(dl);

    out.append(el('p', 'What drives this range', 'calc-block-title'));
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
    out.append(drivers);
    if (result.unpricedScope.length) out.append(list(result.unpricedScope, 'calc-list calc-list-warn'));
    if (result.ownSupplyNotice) out.append(el('p', result.ownSupplyNotice, 'calc-callout'));

    const details = el('details', undefined, 'calc-details');
    details.append(el('summary', 'Included, excluded and contingency'));
    details.append(el('p', 'Included', 'calc-block-title'), list(result.inclusions));
    details.append(el('p', 'Not included', 'calc-block-title'), list(result.exclusions));
    details.append(el('p', 'Contingency', 'calc-block-title'), el('p', result.contingency, 'calc-small'));
    out.append(details);

    out.append(el('p', 'This is an indicative market range, not a quote. Actual costs depend on inspection, plans, selections, site conditions and a written quotation.', 'calc-disclaimer'));
    const links = el('p', undefined, 'calc-small');
    const how = el('a', 'How this is calculated'); how.href = '#how-it-works';
    const dis = el('a', 'Cost estimate disclaimer'); dis.href = '/estimate-disclaimer';
    links.append(how, document.createTextNode(' · '), dis);
    out.append(links);

    const actions = el('div', undefined, 'cc-actions');
    const cta = el('a', 'Request a detailed quote ↗', 'btn btn-gold');
    cta.href = `/plan-your-renovation?${estimateHandoffQuery(input)}`;
    const print = el('button', 'Print estimate', 'cc-print');
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    actions.append(cta, print);
    out.append(actions);
    announce(`${PROJECT_LABEL[input.project]} estimate ${formatRange(result)} including GST`);
  }

  const live = el('p', undefined, 'sr-only');
  live.setAttribute('role', 'status');
  form.append(live);
  // Compact sticky range for narrow screens (rendered in the HTML so it causes no layout shift).
  const bar = form.querySelector('.cc-live');
  let announceTimer;
  function announce(text) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { live.textContent = text; }, 400);
  }

  function setValue(name, value) {
    for (const input of form.querySelectorAll(`input[name="${name}"]`)) {
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
