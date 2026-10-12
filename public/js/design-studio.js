import { activeSteps, BATHROOM_STYLES, cleanDesign, decodeDesign, designRecommendations, designSummary, encodeDesign, labelFor, PALETTES, visibleOptions } from './lib/design-studio.js';
import { loadPlanningContext, savePlanningContext } from './lib/planning-context.js';

const root = document.querySelector('[data-design-studio]');
if (root) {
  const app = root.querySelector('[data-studio-app]');
  const status = root.querySelector('[data-studio-status]');
  const storageKey = 'mr-design-studio-v1';
  const imagery = JSON.parse(root.dataset.studioImagery || '{}');
  const styleImagery = JSON.parse(root.dataset.studioStyleImagery || '{}');
  let config = {};
  try { config = cleanDesign(JSON.parse(sessionStorage.getItem(storageKey) || '{}')); } catch { /* A private browser can still use the studio. */ }
  if (!Object.keys(config).length) { try { config = cleanDesign(loadPlanningContext(sessionStorage).studio); } catch { /* No browser draft is required to begin. */ } }
  const shared = decodeDesign(location.search);
  if (Object.keys(shared).length) config = shared;
  let index = Math.max(0, activeSteps(config).findIndex((step) => step.key === 'summary' || !config[step.key]));
  const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const announce = (text) => { if (status) status.textContent = text; };
  const hasMaterialSwatch = (key) => ['walls','floor','cabinetry','surfaces','fixtures'].includes(key);
  // The image-first selector needs all six photographed styles; otherwise the plain option buttons remain.
  const hasStyleImagery = () => BATHROOM_STYLES.every((style) => styleImagery[style]);
  const isStyleStep = (step) => step.key === 'style' && config.room === 'bathroom' && hasStyleImagery();
  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(cleanDesign(config))); } catch { announce('Your selections remain available on this page. Browser recovery is unavailable.'); }
  }
  function styleCard({ value, label }) {
    const art = styleImagery[value];
    const selected = config.style === value;
    return `<button class="style-card" type="button" data-choice="${value}" aria-pressed="${selected}" aria-label="${escape(label)}. ${escape(art.summary)}" aria-describedby="style-desc-${value}"><span class="style-card-media"><img src="${escape(art.src)}" srcset="${escape(art.srcset)}" sizes="(max-width:600px) 92vw, (max-width:1020px) 46vw, 30vw" alt="" width="${art.width}" height="${art.height}" loading="lazy" decoding="async"></span><span class="style-card-tag" aria-hidden="true">AI-generated concept</span><span class="style-card-check" aria-hidden="true"></span><span class="style-card-body"><span class="style-card-title" aria-hidden="true">${escape(label)}</span><span class="style-card-note" aria-hidden="true">${escape(art.summary)}</span></span><span class="sr-only" id="style-desc-${value}">${escape(art.alt)}</span></button>`;
  }
  function styleNote() {
    const chosen = labelFor('style', config.style);
    return chosen ? `Selected direction: <strong>${escape(chosen)}</strong>. It now leads your moodboard below.` : 'Select a direction to continue.';
  }
  function styleGrid(step) {
    return `<p class="style-step-intro">Six different rooms, six different directions. Choose the one that feels closest; you can refine finishes in the next steps.</p><div class="style-grid" role="group" aria-label="${escape(step.title)}" data-style-grid>${visibleOptions(step, config).map(styleCard).join('')}</div><p class="style-selection-note" data-style-note>${styleNote()}</p>`;
  }
  // Picking a card updates it in place, so the photographs never reload or flicker and the selected state can animate.
  function selectStyle(value) {
    config = cleanDesign({...config, style: value}); persist();
    app.querySelectorAll('.style-card').forEach((card) => card.setAttribute('aria-pressed', String(card.dataset.choice === config.style)));
    app.querySelector('[data-style-note]').innerHTML = styleNote();
    app.querySelector('[data-next]')?.removeAttribute('disabled');
    app.querySelector('.studio-preview').outerHTML = previewMarkup();
    announce(`${labelFor('style', config.style)} selected. Your moodboard has updated.`);
  }
  function previewFigure() {
    const art = config.room === 'bathroom' ? styleImagery[config.style] : undefined;
    if (art) {
      const label = labelFor('style', config.style);
      return `<figure><img class="studio-concept-image studio-style-image" src="${escape(art.src)}" srcset="${escape(art.srcset)}" sizes="(max-width:1020px) 90vw, 42vw" alt="${escape(art.alt)}; concept inspiration for your chosen direction, not a render of all your selections" width="${art.width}" height="${art.height}" loading="lazy" decoding="async"><figcaption>AI-generated concept · ${escape(label)} direction · illustrative only; it does not render your other selections · not completed work.</figcaption></figure>`;
    }
    const image = imagery[config.room] || imagery.workspace;
    return `<figure>${image ? `<img class="studio-concept-image concept-image concept-image-${escape(image.id)}" src="${escape(image.src)}" srcset="${escape(image.srcset)}" sizes="(max-width:1020px) 90vw, 42vw" alt="${escape(image.alt)}; existing concept reference, not a generated result of your selections" width="${image.width}" height="${image.height}" loading="lazy" decoding="async">` : '<p>Concept image unavailable. Your design selections remain usable.</p>'}<figcaption>Existing AI concept inspiration · image does not change to render your selections · not completed work.</figcaption></figure>`;
  }
  function previewMarkup() {
    const palette = config.palette || 'sage-cream';
    return `<aside class="studio-preview" aria-label="Your visual planning board"><div class="studio-preview-media"><p class="eyebrow">YOUR MATERIAL STORY</p><p class="studio-swatch-note">Colour and finish swatches are illustrative. Review actual product samples before selection.</p><h3>${escape(labelFor('style',config.style) || 'A considered beginning')}</h3>${previewFigure()}</div><div class="studio-preview-detail"><div class="studio-palette studio-palette-${palette}" aria-label="${escape(labelFor('palette',palette))}">${PALETTES[palette].map((hex,i) => `<span class="studio-colour studio-colour-${i}" title="${hex}"><span>${hex}</span></span>`).join('')}</div><div class="studio-materials">${['walls','floor','cabinetry','surfaces','fixtures'].filter((key) => config[key]).map((key) => `<span class="studio-material-chip"><span class="studio-material-swatch material-${config[key]}" aria-hidden="true"></span>${escape(labelFor(key,config[key]))}</span>`).join('')}</div><section class="studio-summary"><h3>Selected direction</h3><dl class="studio-summary-list">${designSummary(config).map((row) => `<div class="studio-summary-row"><dt>${escape(row.title)}</dt><dd>${escape(row.value)}</dd></div>`).join('') || '<div><dt>Your board</dt><dd>Choose a room to begin.</dd></div>'}</dl><h3>Worth considering</h3><ul>${designRecommendations(config).map((note) => `<li>${escape(note)}</li>`).join('')}</ul></section></div></aside>`;
  }
  function optionGrid(step) {
    return `<div class="studio-option-grid" role="group" aria-label="${escape(step.title)}">${visibleOptions(step, config).map(({value,label}) => `<button class="studio-option" type="button" data-choice="${value}" aria-pressed="${config[step.key] === value}">${step.key === 'palette' ? `<span class="studio-swatch studio-swatch-${value}" aria-hidden="true"></span>` : ''}${hasMaterialSwatch(step.key) ? `<span class="studio-material-swatch material-${value}" aria-hidden="true"></span>` : ''}<span>${escape(label)}</span></button>`).join('')}</div>`;
  }
  // Arrow keys move through the style cards in reading order; Home and End jump to the first and last card.
  function bindStyleKeys(grid) {
    grid.addEventListener('keydown', (event) => {
      const cards = [...grid.querySelectorAll('.style-card')];
      const current = cards.indexOf(document.activeElement);
      if (current < 0) return;
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      const moves = { ArrowRight: current + 1, ArrowLeft: current - 1, ArrowDown: current + columns, ArrowUp: current - columns, Home: 0, End: cards.length - 1 };
      const next = moves[event.key];
      if (next === undefined || next < 0 || next >= cards.length) return;
      event.preventDefault();
      cards[next].focus();
    });
  }
  function render(focus = false) {
    const steps = activeSteps(config);
    index = Math.min(index, steps.length - 1);
    const step = steps[index];
    const summary = step.key === 'summary';
    const styleStep = isStyleStep(step);
    const controls = summary ? '<p>Your preferences are a starting point for a design conversation. They do not confirm material suitability or construction feasibility.</p>' : styleStep ? styleGrid(step) : optionGrid(step);
    app.innerHTML = `<div class="studio-layout${styleStep ? ' studio-layout--styles' : ''}"><div class="studio-controls"><p class="studio-step-label">${String(index + 1).padStart(2,'0')} / ${steps.length} · ${summary ? 'Review' : 'Design your space'}</p><progress class="studio-progress" value="${index + 1}" max="${steps.length}" aria-label="Design progress"></progress><h2 tabindex="-1" data-step-heading>${escape(step.title)}</h2>${controls}<div class="studio-actions"><button type="button" class="btn btn-outline" data-back ${index === 0 ? 'disabled' : ''}>Back</button>${summary ? '' : `<button type="button" class="btn btn-primary" data-next ${config[step.key] ? '' : 'disabled'}>Next</button>`}</div>${summary ? '<div class="studio-actions"><button type="button" class="btn btn-outline" data-print>Print planning board</button><button type="button" class="btn btn-outline" data-share>Copy design link</button><button type="button" class="btn btn-primary" data-enquire>Discuss this design</button></div>' : ''}<button class="text-link" type="button" data-reset>Start a new direction</button></div>${previewMarkup()}</div>`;
    app.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
      if (styleStep) { selectStyle(button.dataset.choice); return; }
      config = cleanDesign({...config, [step.key]: button.dataset.choice}); persist(); render();
      app.querySelector(`[data-choice="${config[step.key]}"]`)?.focus();
      announce(`${labelFor(step.key, config[step.key])} selected.`);
    }));
    const grid = app.querySelector('[data-style-grid]');
    if (grid) bindStyleKeys(grid);
    app.querySelector('[data-next]')?.addEventListener('click', () => { if (config[step.key]) { index++; render(true); } });
    app.querySelector('[data-back]')?.addEventListener('click', () => { index = Math.max(0,index - 1); render(true); });
    app.querySelector('[data-reset]')?.addEventListener('click', () => { config = {}; index = 0; persist(); try { savePlanningContext(sessionStorage,{studio:{}}); } catch { /* Starting again still clears this board when storage is blocked. */ } history.replaceState(null,'',location.pathname); render(true); announce('Design selections cleared.'); });
    app.querySelector('[data-print]')?.addEventListener('click', () => window.print());
    app.querySelector('[data-share]')?.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}?${encodeDesign(config)}`;
      try { await navigator.clipboard.writeText(url); announce('Design link copied. It contains design choices only.'); }
      catch { const field = document.createElement('input'); field.type = 'url'; field.value = url; field.readOnly = true; field.setAttribute('aria-label','Shareable design link'); app.querySelector('.studio-controls').append(field); field.focus(); field.select(); announce('Copy the selected design link.'); }
    });
    app.querySelector('[data-enquire]')?.addEventListener('click', () => { try { savePlanningContext(sessionStorage,{studio:cleanDesign(config)}); } catch { /* The safe query carries choices when browser storage is blocked. */ } const query = new URLSearchParams({from:'design-studio',studio:JSON.stringify(cleanDesign(config))}); location.assign(`/plan-your-renovation?${query}`); });
    if (focus) app.querySelector('[data-step-heading]')?.focus();
  }
  render();
}
