import { estimateBathroom, toQuestionnaireParams, PLANNER_CHOICES, PLANNER_FLAGS, SIZE_PRESETS, compareScenarios } from './lib/estimate.js';
import { savePlanningContext, loadPlanningContext } from './lib/planning-context.js';
import { clearErrors, showErrors } from './lib/ui.js';

const form = document.querySelector('[data-calculator]');
const output = document.querySelector('#calc-result [data-result]');

const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};

function read() {
  const data = new FormData(form);
  const flag = (name) => data.get(name) === 'on';
  const input = {
    lengthM: Number(data.get('lengthM')), widthM: Number(data.get('widthM')),
    renovationType: String(data.get('renovationType')), finish: String(data.get('finish')), plumbing: String(data.get('plumbing')),
    accessibility: flag('accessibility'), strata: flag('strata'), olderHome: flag('olderHome'), limitedAccess: flag('limitedAccess'),
  };
  if (data.get('areaInputM2')) input.areaInputM2 = Number(data.get('areaInputM2'));
  for (const key of Object.keys(PLANNER_CHOICES)) if (data.has(key)) input[key] = String(data.get(key));
  for (const key of PLANNER_FLAGS) if (form.elements.namedItem(key)) input[key] = flag(key);
  return input;
}

function render() {
  clearErrors(form);
  const input = read();
  form.querySelectorAll('[data-calc-preset]').forEach((button) => {
    const preset = SIZE_PRESETS[button.dataset.calcPreset];
    button.setAttribute('aria-pressed', String(Boolean(preset && input.areaInputM2 === undefined && input.lengthM === preset.lengthM && input.widthM === preset.widthM)));
  });
  const result = estimateBathroom(input);
  output.replaceChildren();
  if (!result.ok) {
    showErrors(form, result.errors);
    output.append(el('p', 'Check the highlighted measurements to see your planning profile.'));
    return;
  }
  try { savePlanningContext(sessionStorage, { planner: input }); } catch { /* Planning remains usable without browser storage. */ }

  output.append(el('h2', result.levelLabel, 'calc-level'));
  output.append(el('p', `${result.areaM2} m² bathroom · ${result.scopeScore} scope points`, 'calc-meta'));
  const meter = document.createElement('meter');
  meter.min = 1; meter.max = 20; meter.value = Math.min(result.scopeScore, 20);
  meter.setAttribute('aria-label', 'Relative scope level');
  output.append(meter);
  if (result.mode === 'priced') {
    const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
    output.append(el('h3', `${currency.format(result.lowAud)}–${currency.format(result.highAud)}`, 'calc-subhead'));
    output.append(el('p', `Indicative range · GST ${result.gstTreatment === 'inclusive' ? 'included' : 'excluded'} · rate card ${result.rateCardVersion} · source ${result.sourceDate}`, 'fine-print'));
    const pricing = el('ul', undefined, 'calc-drivers');
    [...result.pricingAssumptions, ...result.pricingExclusions].forEach((item) => pricing.append(el('li', item)));
    output.append(pricing);
  } else {
    output.append(el('p', 'Scope planning mode: Milestone has not approved a rate card. Dollar estimates are unavailable until pricing assumptions are approved.', 'fine-print'));
  }

  output.append(el('h3', 'What is shaping this scope', 'calc-subhead'));
  const list = el('ul', undefined, 'calc-drivers');
  (result.drivers.length ? result.drivers : ['A like-for-like refresh with no major site considerations.']).forEach((d) => list.append(el('li', d)));
  output.append(list);

  output.append(el('h3', 'Ways to simplify your scope', 'calc-subhead'));
  const savings = el('ul', undefined, 'calc-drivers');
  result.savings.forEach((item) => savings.append(el('li', item)));
  output.append(savings);
  output.append(el('h3', 'Compare planning scenarios', 'calc-subhead'));
  const comparison = el('div', undefined, 'calc-comparison');
  compareScenarios(input).forEach((scenario) => {
    const card = el('section', undefined, 'calc-scenario');
    card.append(el('h4', scenario.title), el('p', `${scenario.levelLabel} · ${scenario.scopeScore} relative scope points`));
    comparison.append(card);
  });
  output.append(comparison, el('p', 'Scenario scores compare coordination and scope, not cost or construction duration.', 'fine-print'));
  output.append(el('h3', 'Timing and uncertainties', 'calc-subhead'), el('p', result.timeline));
  const exclusions = el('ul', undefined, 'calc-drivers');
  result.exclusions.forEach((item) => exclusions.append(el('li', item)));
  output.append(exclusions);

  output.append(el('p', 'This is a planning guide, not a quote. Costs depend on a site assessment, product selections and current trade pricing.', 'fine-print'));
  const cta = el('a', 'Request a site assessment ↗', 'btn btn-dark');
  cta.href = `/plan-your-renovation?${toQuestionnaireParams(input)}`;
  cta.addEventListener('click', () => {
    try { savePlanningContext(sessionStorage, { planner: input }); } catch { /* The query handoff remains available when browser storage is blocked. */ }
  });
  output.append(cta);
}

form?.addEventListener('submit', (event) => { event.preventDefault(); render(); form.querySelector('[aria-invalid="true"]')?.focus(); });
form?.addEventListener('input', render);
form?.querySelectorAll('[data-calc-preset]').forEach((button) => button.addEventListener('click', () => {
  const preset = SIZE_PRESETS[button.dataset.calcPreset];
  if (!preset) return;
  for (const key of ['lengthM', 'widthM']) form.elements.namedItem(key).value = preset[key];
  const direct = form.elements.namedItem('areaInputM2');
  if (direct) direct.value = '';
  render();
}));
if (form) {
  try {
    const saved = loadPlanningContext(sessionStorage)?.planner;
    if (saved) for (const [key, value] of Object.entries(saved)) {
      const control = form.elements.namedItem(key);
      if (!control) continue;
      if (control.type === 'checkbox') control.checked = value === true;
      else control.value = String(value);
    }
  } catch { /* Default selections remain available when browser storage is blocked. */ }
  render();
}
