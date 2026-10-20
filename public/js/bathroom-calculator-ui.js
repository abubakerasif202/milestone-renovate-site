import { calculateBathroom, BATHROOM_DEFAULTS, bathroomMoney, validateBathroomContact } from './lib/bathroom-calculator.js';
import { submitEnquiry } from './lib/enquiry-client.js';
const form = document.querySelector('[data-bathroom-calculator]');
if (form) {
  form.querySelector('[data-send]').disabled = false;
  const startedAt = Date.now();
  let idempotencyKey = crypto.randomUUID();
  let attempted = false; let sending = false;
  const status = form.querySelector('[data-submit-status]');
  const errors = form.querySelector('[data-errors]');
  const fallback = form.querySelector('[data-contact-fallback]');
  function options() {
    const data = new FormData(form);
    return { ...BATHROOM_DEFAULTS, size: data.get('size'), subfloor: data.get('subfloor'), access: data.get('property') === 'ground' ? 'ground' : data.get('lift') === 'no' ? 'apartment_stairs_only' : 'apartment_with_lift', package: data.get('package'), ...Object.fromEntries(['removeWalls', 'changeLayout', 'recessedNiche', 'diyDemo', 'diyPaint'].map(key => [key, data.has(key)])) };
  }
  function update() {
    const lift = form.querySelector('[data-lift]');
    const ground = new FormData(form).get('property') === 'ground';
    lift.hidden = ground; lift.disabled = ground;
    if (ground) form.querySelector('[name=lift][value=yes]').checked = true;
    const selected = options(); const result = calculateBathroom(selected);
    form.querySelector('[data-price]').textContent = `${bathroomMoney(result.costMin)}–${bathroomMoney(result.costMax)}`;
    form.querySelector('[data-weeks]').textContent = `${result.weeksMin}–${result.weeksMax} weeks`;
    fallback.href = '/contact?' + new URLSearchParams({ bathroomEstimate: JSON.stringify(selected) });
  }
  form.addEventListener('change', () => { if (!sending) { form.querySelector('[data-send]').disabled = false; if (attempted) { idempotencyKey = crypto.randomUUID(); attempted = false; } update(); } });
  form.addEventListener('input', () => { if (attempted && !sending) { idempotencyKey = crypto.randomUUID(); attempted = false; } });
  form.querySelector('[data-reset]').addEventListener('click', () => {
    for (const [key, value] of Object.entries(BATHROOM_DEFAULTS)) {
      if (key === 'access') continue;
      const field = form.elements.namedItem(key);
      if (typeof value === 'boolean') field.checked = value; else field.value = value;
    }
    form.elements.namedItem('property').value = 'ground';
    idempotencyKey = crypto.randomUUID(); attempted = false; form.querySelector('[data-send]').disabled = false; update();
  });
  function showErrors(fields) {
    errors.replaceChildren();
    form.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
    for (const [key, message] of Object.entries(fields)) {
      const p = document.createElement('p'); p.id = `bc-error-${key}`; p.textContent = message; errors.append(p);
      const input = form.elements.namedItem(key);
      if (input instanceof HTMLElement) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', p.id); }
    }
    errors.hidden = !Object.keys(fields).length;
    if (!errors.hidden) errors.focus();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (sending) return;
    const data = new FormData(form);
    const contact = Object.fromEntries(['name', 'postcode', 'email', 'phone', 'message'].map(key => [key, String(data.get(key) ?? '').trim()]));
    contact.consent = data.has('consent');
    const fields = validateBathroomContact(contact); showErrors(fields);
    if (Object.keys(fields).length) return;
    const selected = options();
    const payload = { ...contact, enquiryType: 'bathroom_renovation_calculator', idempotencyKey, sourcePage: '/bathroom-renovation-cost', formStartedAt: startedAt, options: selected, ...calculateBathroom(selected), website: String(data.get('website') ?? '') };
    sending = true; attempted = true;
    // Freeze the submitted snapshot so a late response cannot confirm different visible choices.
    const controls = [...form.querySelectorAll('input,textarea,button')].filter(el => !el.disabled);
    controls.forEach(el => { el.disabled = true; }); status.textContent = 'Submitting your estimate…';
    const result = await submitEnquiry(payload);
    controls.forEach(el => { el.disabled = false; }); sending = false;
    if (result.ok) {
      status.textContent = `Our email service accepted your request. Reference ${result.reference}. Inbox delivery is not confirmed here. Please call if you need immediate assistance.`;
      form.querySelector('[data-send]').disabled = true;
      // A changed selection or contact detail starts a new request.
      form.addEventListener('input', () => { form.querySelector('[data-send]').disabled = false; }, { once: true });
    } else { status.textContent = result.message; if (result.fields) showErrors(result.fields); }
  });
  // Keep fallback independent of contact details and safe to share.
  update();
}
