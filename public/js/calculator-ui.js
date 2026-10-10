import { estimateBathroom, toQuestionnaireParams } from './lib/estimate.js';
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
  return {
    lengthM: Number(data.get('lengthM')), widthM: Number(data.get('widthM')),
    renovationType: String(data.get('renovationType')), finish: String(data.get('finish')), plumbing: String(data.get('plumbing')),
    accessibility: flag('accessibility'), strata: flag('strata'), olderHome: flag('olderHome'), limitedAccess: flag('limitedAccess'),
  };
}

function render() {
  clearErrors(form);
  const input = read();
  const result = estimateBathroom(input);
  output.replaceChildren();
  if (!result.ok) {
    showErrors(form, result.errors);
    output.append(el('p', 'Check the highlighted measurements to see your planning profile.'));
    return;
  }

  output.append(el('h2', result.levelLabel, 'calc-level'));
  output.append(el('p', `${result.areaM2} m² bathroom · ${result.scopeScore} scope points`, 'calc-meta'));
  const meter = document.createElement('meter');
  meter.min = 1; meter.max = 12; meter.value = Math.min(result.scopeScore, 12);
  meter.setAttribute('aria-label', 'Relative scope level');
  output.append(meter);

  output.append(el('h3', 'What is shaping this scope', 'calc-subhead'));
  const list = el('ul', undefined, 'calc-drivers');
  (result.drivers.length ? result.drivers : ['A like-for-like refresh with no major site considerations.']).forEach((d) => list.append(el('li', d)));
  output.append(list);

  output.append(el('p', 'This is a planning guide, not a quote. Costs depend on a site assessment, product selections and current trade pricing.', 'fine-print'));
  const cta = el('a', 'Take this to the questionnaire ↗', 'btn btn-dark');
  cta.href = `/plan-your-renovation?${toQuestionnaireParams(input)}`;
  output.append(cta);
}

form?.addEventListener('submit', (event) => { event.preventDefault(); render(); });
form?.addEventListener('input', render);
if (form) render();
