import { savePlanningContext } from './lib/planning-context.js';

const form = document.querySelector('[data-postcode-entry]');
form?.elements.postcode.addEventListener('invalid', (event) => {
  event.preventDefault();
  const input = event.target;
  const error = form.querySelector('#postcode-error');
  input.setAttribute('aria-invalid', 'true');
  error.textContent = 'Enter a four-digit Australian postcode.';
  error.hidden = false;
  input.focus();
});
form?.addEventListener('submit', (event) => {
  const input = form.elements.postcode;
  const error = form.querySelector('#postcode-error');
  const postcode = input.value.trim();
  if (!/^\d{4}$/.test(postcode) || Number(postcode) < 200) {
    event.preventDefault();
    input.setAttribute('aria-invalid', 'true');
    error.textContent = 'Enter a four-digit Australian postcode.';
    error.hidden = false;
    input.focus();
    return;
  }
  input.removeAttribute('aria-invalid');
  error.hidden = true;
  // Query-string fallback still works when session storage is unavailable.
  try { savePlanningContext(sessionStorage, { postcode }); } catch { /* Location remains in the form's GET handoff. */ }
});
