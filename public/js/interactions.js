// Before/after comparison slider and gallery category filter.
// Pointer, touch and keyboard input all go through a native <input type="range">, so behaviour is accessible by default.
// The divider position is applied through a constructable stylesheet (CSP-safe: no inline style attributes).

const sheet = new CSSStyleSheet();
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

function initCompare(root, index) {
  const range = root.querySelector('.compare-range');
  const stage = root.querySelector('.compare-stage');
  if (!range || !stage) return;
  const id = `c${index}`;
  stage.dataset.compareId = id;
  const rule = sheet.cssRules[sheet.insertRule(`.compare-stage[data-compare-id="${id}"]{--pos:${range.value}%}`, sheet.cssRules.length)];
  const update = () => {
    rule.style.setProperty('--pos', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${range.value}% existing view, ${100 - range.value}% reimagined concept`);
  };
  range.addEventListener('input', update);
  update();
}

function initFilter(bar) {
  const items = [...document.querySelectorAll('[data-category]')];
  const buttons = [...bar.querySelectorAll('[data-filter]')];
  const status = document.getElementById('filter-status');
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    const wanted = btn.dataset.filter;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    let shown = 0;
    items.forEach((item) => {
      const match = wanted === 'all' || item.dataset.category === wanted;
      item.hidden = !match;
      if (match) shown += 1;
    });
    if (status) status.textContent = `Showing ${shown} of ${items.length} design references`;
  }));
}

document.querySelectorAll('[data-compare]').forEach(initCompare);
document.querySelectorAll('[data-filter-bar]').forEach(initFilter);
