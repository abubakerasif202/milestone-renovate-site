import { clearPlanningContext, loadPlanningContext, planningEntries, sanitizePlanningContext, savePlanningContext } from './lib/planning-context.js';
import { clearSessionKey, sessionKey, submitEnquiry } from './lib/enquiry-client.js';
import { clearDraft, loadDraft, restoreDraft, saveDraft, serializeDraft } from './lib/wizard-draft.js';
import { clearErrors, setBusy, setStatus, showErrors, showSuccess, showSummary } from './lib/ui.js';
import {
  applyPlanningContext, answeredSteps, CATEGORY_LABELS, OPTIONS, STEPS, TOTAL_STEPS, advance, back, buildPayload, initialState, progress, setCategory, validateStep,
} from './lib/wizard.js';

const form = document.querySelector('[data-wizard]');
if (form) init(form);

function init(root) {
  let storage;
  try { storage = window.sessionStorage; } catch { storage = null; }
  const fieldsets = [...root.querySelectorAll('.wizard-step')];
  const label = root.querySelector('#wizard-step-label');
  const bar = root.querySelector('#wizard-progress');
  const backBtn = root.querySelector('[data-back]');
  const nextBtn = root.querySelector('[data-next]');
  const submitBtn = root.querySelector('[data-submit]');
  const startedAt = Date.now();
  const idempotencyKey = sessionKey(storage, 'wizard');
  const params = new URLSearchParams(location.search);
  const source = params.get('from') === 'calculator' ? 'calculator' : 'wizard';
  const handedOff = params.has('category') || params.has('postcode') || ['calculator', 'design-studio', 'postcode'].includes(params.get('from'));
  const draft = loadDraft(storage);
  let state = handedOff ? prefill(initialState(), params) : restoreDraft(draft, initialState());
  let shownStep = 0; // the step currently on screen, used to pick the transition direction
  const stepMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let planning = loadPlanningContext(storage);
  for (const section of ['studio', 'planner', 'estimate']) {
    const encoded = params.get(section);
    if (encoded && encoded.length <= 2000) { try { planning = sanitizePlanningContext({ ...planning, [section]: JSON.parse(encoded) }); } catch { /* Invalid handoff is ignored. */ } }
  }
  if (params.has('postcode')) planning = sanitizePlanningContext({ ...planning, postcode: params.get('postcode') });
  if (params.get('from') === 'design-studio' && planning.studio?.room !== 'bathroom') delete planning.planner;
  if (params.get('from') === 'calculator' && planning.studio?.room !== 'bathroom') delete planning.studio;
  if (params.has('category') && params.get('from') !== 'calculator') {
    if (params.get('category') !== 'bathroom') delete planning.planner;
    if (planning.estimate && planning.estimate.project !== params.get('category')) delete planning.estimate;
    const studioCategory = { bathroom: 'bathroom', kitchen: 'kitchen', living: 'whole_home' }[planning.studio?.room];
    if (studioCategory && studioCategory !== params.get('category')) delete planning.studio;
  }
  state = (handedOff || !draft) ? applyPlanningContext(state, planning) : { ...state, planning };
  const importedSteps = (planning.planner || planning.studio || planning.estimate || planning.postcode) ? answeredSteps(state) : new Set();
  if (handedOff || (!draft && importedSteps.size)) {
    while (state.step < TOTAL_STEPS - 1 && importedSteps.has(STEPS[state.step].id)) state.step += 1;
  }
  const review = document.createElement('section');
  review.className = 'planning-review';
  review.setAttribute('aria-label', 'Your carried-over renovation plans');
  root.prepend(review);
  if (importedSteps.size) {
    const heading = document.createElement('h2'); heading.textContent = 'Your planning brief'; review.append(heading);
    const explanation = document.createElement('p'); explanation.textContent = 'Your selections are included below. Already answered steps are skipped; you can edit any answer before sending.'; review.append(explanation);
    const entries = planningEntries(planning);
    if (planning.postcode) entries.unshift(['Postcode', planning.postcode]);
    const list = document.createElement('dl');
    for (const [key, value] of entries) { const dt = document.createElement('dt'); dt.textContent = key; const dd = document.createElement('dd'); dd.textContent = value; list.append(dt, dd); }
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Review included planning selections';
    details.append(summary, list); review.append(details);
    for (const [section, url, label] of [['planner', '/bathroom-renovation-cost', 'Edit bathroom plan'], ['estimate', '/bathroom-renovation-cost', 'Edit cost estimate'], ['studio', '/renovation-design-studio', 'Edit design preferences']]) {
      if (planning[section]) { const link = document.createElement('a'); link.href = url; link.textContent = label; review.append(link); }
    }
    for (const stepId of importedSteps) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-outline'; button.textContent = `Edit ${stepId}`;
      button.addEventListener('click', () => { state = { ...readState(), step: STEPS.findIndex(step => step.id === stepId) }; clearErrors(root); render(true); }); review.append(button);
    }
  } else review.hidden = true;
  root.classList.add('is-enhanced');
  syncFormFromState();
  render(false);
  if (handedOff && storage) {
    try {
      savePlanningContext(storage, planning);
      if (JSON.stringify(loadDraft(storage)) === JSON.stringify(serializeDraft(state)) && JSON.stringify(loadPlanningContext(storage)) === JSON.stringify(sanitizePlanningContext(planning))) history.replaceState(null, '', location.pathname);
    } catch { /* Handoff remains in the URL when storage cannot retain it. */ }
  }

  root.addEventListener('input', event => {
    if (event.target.name === 'category') return;
    state = readState(); saveDraft(storage, state);
  });
  root.addEventListener('change', () => {
    const previous = state.category;
    state = readState();
    if (state.category !== previous) {
      state = setCategory(state, state.category);
      const staleEstimate = Boolean(planning.estimate && planning.estimate.project !== state.category);
      if (staleEstimate) delete planning.estimate;
      if ((planning.planner && state.category !== 'bathroom') || staleEstimate) {
        delete planning.planner;
        state = { ...state, roomSize: '', finishLevel: '', layoutChange: '', propertyType: '', timeline: '' };
      }
      const studioCategory = { bathroom: 'bathroom', kitchen: 'kitchen', living: 'whole_home' }[planning.studio?.room];
      if (studioCategory && studioCategory !== state.category) delete planning.studio;
      state.planning = planning;
      savePlanningContext(storage, { planner: planning.planner, studio: planning.studio, estimate: planning.estimate });
      importedSteps.clear();
      if (state.postcode && state.postcode === planning.postcode) importedSteps.add('location');
      review.hidden = true;
      syncFormFromState(); syncScope();
    }
    saveDraft(storage, state);
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
    while (state.step < TOTAL_STEPS - 1 && importedSteps.has(STEPS[state.step].id)) state.step += 1;
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
    const payload = { ...buildPayload(state, { idempotencyKey, startedAt, source: planning.planner || planning.estimate ? 'calculator' : source }), website: String(new FormData(root).get('website') ?? '') };
    const result = await submitEnquiry(payload);
    setBusy(submitBtn, false);
    if (result.ok) {
      clearSessionKey(storage, 'wizard');
      clearDraft(storage);
      clearPlanningContext(storage);
      root.hidden = true;
      showSuccess(result.reference);
      return;
    }
    setStatus(root, '');
    if (result.kind === 'validation' && result.fields) showErrors(root, result.fields)?.focus();
    showSummary(root, result.retryable ? `${result.message} You can press “Send my brief” again — it will not create a duplicate.` : result.message);
  }

  /** The incoming step wipes in from the side it is reached from (CSS only; skipped under reduced motion). */
  function transitionTo(step) {
    if (stepMotion.matches || step === shownStep) { shownStep = step; return; }
    root.dataset.stepDir = step > shownStep ? 'forward' : 'back';
    const incoming = fieldsets[step];
    incoming.classList.remove('is-entering');
    void incoming.offsetWidth; // restart the animation when the same step is revisited
    incoming.classList.add('is-entering');
    incoming.addEventListener('animationend', () => incoming.classList.remove('is-entering'), { once: true });
    shownStep = step;
  }

  function render(moveFocus) {
    fieldsets.forEach((fs, i) => { fs.hidden = i !== state.step; });
    if (moveFocus) transitionTo(state.step); else shownStep = state.step;
    const p = progress(state);
    label.textContent = `Step ${p.current} of ${p.total}`;
    bar.value = p.current;
    bar.setAttribute('aria-valuetext', `Step ${p.current} of ${p.total}`);
    backBtn.hidden = state.step === 0;
    const last = state.step === TOTAL_STEPS - 1;
    nextBtn.hidden = last;
    submitBtn.hidden = !last;
    syncScope();
    saveDraft(storage, state);
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
    root.querySelectorAll('input[type=radio],input[name=scope]').forEach(input => { input.checked = false; });
    const setRadio = (name, value) => { const el = root.querySelector(`input[name="${name}"][value="${value}"]`); if (el && value) el.checked = true; };
    setRadio('category', state.category);
    setRadio('layoutChange', state.layoutChange);
    setRadio('roomSize', state.roomSize);
    setRadio('finishLevel', state.finishLevel);
    for (const name of ['propertyType', 'budgetRange', 'timeline']) {
      const el = root.querySelector(`select[name="${name}"]`);
      if (el) el.value = state[name] ?? ''; else setRadio(name, state[name]);
    }
    for (const name of ['suburb', 'postcode', 'details']) {
      const el = root.querySelector(`[name="${name}"]`);
      if (el && state[name]) el.value = state[name];
    }
    state.scope.forEach((value) => { const el = root.querySelector(`input[name="scope"][value="${value}"]:not(:disabled)`) ?? root.querySelector(`input[name="scope"][value="${value}"]`); if (el) el.checked = true; });
  }
}

/** Pre-fill from whitelisted query parameters (calculator and service-page hand-offs). */
function prefill(state, params) {
  const allowed = (key, name) => OPTIONS[name]?.some(([value]) => value === params.get(key)) ? params.get(key) : '';
  let next = { ...state };
  const category = params.get('category');
  if (Object.hasOwn(CATEGORY_LABELS, category)) next = { ...setCategory(next, category), step: 1 };
  if (/^\d{4}$/.test(params.get('postcode') ?? '') && Number(params.get('postcode')) >= 200) next.postcode = params.get('postcode');
  next.finishLevel = allowed('finish', 'finishLevel');
  next.layoutChange = allowed('layout', 'layoutChange');
  next.roomSize = allowed('size', 'roomSize');
  if (params.get('plumbing') === '1' && next.category === 'bathroom') next.scope = ['relocate_plumbing'];
  return next;
}
