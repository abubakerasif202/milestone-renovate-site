import { clearSessionKey, sessionKey, submitEnquiry } from './lib/enquiry-client.js';
import { clearErrors, setBusy, setStatus, showErrors, showSuccess, showSummary } from './lib/ui.js';
import {
  CATEGORY_LABELS, OPTIONS, STEPS, TOTAL_STEPS, advance, back, buildPayload, initialState, progress, setCategory, validateStep,
} from './lib/wizard.js';

const form = document.querySelector('[data-wizard]');
if (form) init(form);

function init(root) {
  const fieldsets = [...root.querySelectorAll('.wizard-step')];
  const label = root.querySelector('#wizard-step-label');
  const bar = root.querySelector('#wizard-progress');
  const backBtn = root.querySelector('[data-back]');
  const nextBtn = root.querySelector('[data-next]');
  const submitBtn = root.querySelector('[data-submit]');
  const startedAt = Date.now();
  const params = new URLSearchParams(location.search);
  const source = params.get('from') === 'calculator' ? 'calculator' : 'wizard';
  let state = prefill(initialState(), params);

  root.classList.add('is-enhanced');
  syncFormFromState();
  render(false);

  root.addEventListener('input', () => { state = readState(); });
  root.addEventListener('change', () => {
    const previous = state.category;
    state = readState();
    if (state.category !== previous) { state = setCategory(state, state.category); syncScope(); }
  });

  nextBtn.addEventListener('click', goNext);
  backBtn.addEventListener('click', () => { state = back(readState()); clearErrors(root); render(true); });
  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    state = readState();
    if (state.step < TOTAL_STEPS - 1) { goNext(); return; }
    await send();
  });

  function goNext() {
    state = readState();
    clearErrors(root);
    const result = advance(state);
    if (Object.keys(result.errors).length > 0) { showErrors(root, result.errors)?.focus(); return; }
    state = result.state;
    render(true);
  }

  async function send() {
    clearErrors(root);
    for (let i = 0; i < STEPS.length; i += 1) {
      const errors = validateStep(state, STEPS[i].id);
      if (Object.keys(errors).length > 0) {
        state = { ...state, step: i };
        render(true);
        showErrors(root, errors)?.focus();
        return;
      }
    }
    setBusy(submitBtn, true);
    setStatus(root, 'Sending your brief…');
    const payload = { ...buildPayload(state, { idempotencyKey: sessionKey(sessionStorage, 'wizard'), startedAt, source }), website: String(new FormData(root).get('website') ?? '') };
    const result = await submitEnquiry(payload);
    setBusy(submitBtn, false);
    if (result.ok) {
      clearSessionKey(sessionStorage, 'wizard');
      root.hidden = true;
      showSuccess(result.reference);
      return;
    }
    setStatus(root, '');
    if (result.kind === 'validation' && result.fields) showErrors(root, result.fields)?.focus();
    showSummary(root, result.retryable ? `${result.message} You can press “Send my brief” again — it will not create a duplicate.` : result.message);
  }

  function render(moveFocus) {
    fieldsets.forEach((fs, i) => { fs.hidden = i !== state.step; });
    const p = progress(state);
    label.textContent = `Step ${p.current} of ${p.total}`;
    bar.value = p.current;
    bar.setAttribute('aria-valuetext', `Step ${p.current} of ${p.total}`);
    backBtn.hidden = state.step === 0;
    const last = state.step === TOTAL_STEPS - 1;
    nextBtn.hidden = last;
    submitBtn.hidden = !last;
    syncScope();
    if (moveFocus) fieldsets[state.step].querySelector('legend')?.focus();
  }

  /** Only the scope options relevant to the chosen category are offered. */
  function syncScope() {
    root.querySelectorAll('[data-scope-for]').forEach((group) => {
      const show = group.dataset.scopeFor === state.category;
      group.hidden = !show;
      group.querySelectorAll('input').forEach((input) => { input.disabled = !show; });
    });
  }

  function readState() {
    const data = new FormData(root);
    const text = (name) => String(data.get(name) ?? '');
    return {
      ...state,
      category: text('category'), suburb: text('suburb'), postcode: text('postcode'), propertyType: text('propertyType'),
      scope: data.getAll('scope').map(String), layoutChange: text('layoutChange'), roomSize: text('roomSize'), finishLevel: text('finishLevel'),
      budgetRange: text('budgetRange'), timeline: text('timeline'), details: text('details'),
      name: text('name'), phone: text('phone'), email: text('email'), consent: data.get('consent') === 'on',
    };
  }

  function syncFormFromState() {
    const setRadio = (name, value) => { const el = root.querySelector(`input[name="${name}"][value="${value}"]`); if (el && value) el.checked = true; };
    setRadio('category', state.category);
    setRadio('layoutChange', state.layoutChange);
    setRadio('roomSize', state.roomSize);
    setRadio('finishLevel', state.finishLevel);
    state.scope.forEach((value) => { const el = root.querySelector(`input[name="scope"][value="${value}"]:not(:disabled)`) ?? root.querySelector(`input[name="scope"][value="${value}"]`); if (el) el.checked = true; });
  }
}

/** Pre-fill from whitelisted query parameters (calculator and service-page hand-offs). */
function prefill(state, params) {
  const allowed = (key, name) => OPTIONS[name]?.some(([value]) => value === params.get(key)) ? params.get(key) : '';
  let next = { ...state };
  const category = params.get('category');
  if (category in CATEGORY_LABELS) next = { ...setCategory(next, category), step: 1 };
  next.finishLevel = allowed('finish', 'finishLevel');
  next.layoutChange = allowed('layout', 'layoutChange');
  next.roomSize = allowed('size', 'roomSize');
  if (params.get('plumbing') === '1' && next.category === 'bathroom') next.scope = ['relocate_plumbing'];
  return next;
}
