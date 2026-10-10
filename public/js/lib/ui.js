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
  if (busy) { button.dataset.idle = button.textContent; button.textContent = 'Sending…'; }
  else if (button.dataset.idle) { button.textContent = idleHtmlLabel ?? button.dataset.idle; }
}

export const setStatus = (root, text) => {
  const status = root.querySelector('#form-status');
  if (status) status.textContent = text;
};

export function showSuccess(reference) {
  const panel = document.querySelector('#form-success');
  panel.querySelector('[data-reference]').textContent = reference;
  panel.hidden = false;
  panel.focus();
  panel.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
