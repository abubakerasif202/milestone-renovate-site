// Small DOM helpers shared by the enquiry form, questionnaire and calculator (no innerHTML anywhere).

export function clearErrors(root) {
  root.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; el.hidden = true; });
  root.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  const summary = root.querySelector('#form-error');
  if (summary) { summary.textContent = ''; summary.hidden = true; }
}

/** Show per-field messages; returns the first control that has an error so callers can focus it. */
export function showErrors(root, errors) {
  let first = null;
  for (const [name, message] of Object.entries(errors)) {
    const slot = root.querySelector(`#${CSS.escape(name)}-error`);
    if (slot) { slot.textContent = message; slot.hidden = false; }
    const control = root.querySelector(`[name="${CSS.escape(name)}"]`);
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      first ??= control;
    }
  }
  return first;
}

export function showSummary(root, message) {
  const summary = root.querySelector('#form-error');
  if (!summary) return;
  summary.textContent = message;
  summary.hidden = false;
  summary.focus();
}

export function setBusy(button, busy, idleHtmlLabel) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  // The spinner and the softened form are CSS-only (.is-busy / .is-sending); under reduced motion the spinner is a static ring.
  button.classList.toggle('is-busy', busy);
  const form = button.closest('form');
  if (form) { form.classList.toggle('is-sending', busy); form.setAttribute('aria-busy', String(busy)); }
  if (busy) { button.dataset.idle = button.textContent; button.textContent = 'Sending…'; }
  else if (button.dataset.idle) { button.textContent = idleHtmlLabel ?? button.dataset.idle; }
}

export const setStatus = (root, text) => {
  const status = root.querySelector('#form-status');
  if (status) status.textContent = text;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Decorative drawn tick (aria-hidden): the ring and the tick draw in via CSS when the panel enters. */
function successMark() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'success-mark');
  svg.setAttribute('viewBox', '0 0 52 52');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('class', 'success-ring');
  for (const [name, value] of [['cx', '26'], ['cy', '26'], ['r', '24']]) ring.setAttribute(name, value);
  const tick = document.createElementNS(SVG_NS, 'path');
  tick.setAttribute('class', 'success-tick');
  tick.setAttribute('d', 'M15 27.5l8 8 15-17');
  svg.append(ring, tick);
  return svg;
}

/** Shared success reveal: the panel rises in, the tick draws, focus moves to it and it is scrolled into view. */
export function revealSuccess(panel) {
  if (!panel.querySelector('.success-mark')) panel.prepend(successMark());
  panel.hidden = false;
  panel.classList.remove('is-entering');
  void panel.offsetWidth; // restart the entrance if the panel is shown more than once
  panel.classList.add('is-entering');
  panel.addEventListener('animationend', (event) => { if (event.target === panel) panel.classList.remove('is-entering'); }, { once: true });
  panel.focus({ preventScroll: true });
  panel.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function showSuccess(reference) {
  const panel = document.querySelector('#form-success');
  panel.querySelector('[data-reference]').textContent = reference;
  revealSuccess(panel);
}
