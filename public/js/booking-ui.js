import { isAuPhone, isAuPostcode, isEmail, normalisePhone } from './lib/au.js';
import { clearSessionKey, sessionKey, submitEnquiry } from './lib/enquiry-client.js';
import { clearErrors, revealSuccess, setBusy, setStatus, showErrors } from './lib/ui.js';

const form = document.querySelector('[data-booking-form]');
const startedAt = Date.now();

function validate(values) {
  const errors = {};
  if (values.name.length < 2) errors.name = 'Please enter your full name.';
  if (!isAuPhone(normalisePhone(values.phone))) errors.phone = 'Please enter a valid Australian phone number.';
  if (!isEmail(values.email)) errors.email = 'Please enter a valid email address.';
  if (!values.postcode && !values.suburb) errors.postcode = 'Please enter your suburb or postcode.';
  else if (values.postcode && !isAuPostcode(values.postcode)) errors.postcode = 'Please enter a valid 4-digit Australian postcode.';
  if (!values.date) errors.date = 'Please choose a preferred consultation date.';
  if (!values.time) errors.time = 'Please choose a preferred time slot.';
  if (!values.consent) errors.consent = 'Please confirm you agree to us contacting you about your appointment.';
  return errors;
}

function read() {
  const data = new FormData(form);
  const text = (name) => String(data.get(name) ?? '').trim();
  return {
    name: text('name'),
    phone: text('phone'),
    email: text('email'),
    category: text('category') || 'whole_home',
    suburb: text('suburb'),
    postcode: text('postcode'),
    date: text('bookingDate'),
    time: text('bookingTime'),
    details: text('details'),
    consent: data.get('consent') === 'on',
    website: text('website'),
  };
}

function payloadFrom(values) {
  const combinedDetails = `[15-Min Strategy Call Request: ${values.date} at ${values.time}] ${values.details || 'General renovation consultation'}`.trim();
  const payload = {
    idempotencyKey: sessionKey(sessionStorage, 'booking'),
    source: 'contact-form',
    sourcePage: '/booking',
    name: values.name,
    phone: values.phone,
    email: values.email,
    category: values.category,
    details: combinedDetails,
    consent: values.consent,
    website: values.website,
    formStartedAt: startedAt,
  };
  if (values.suburb) payload.suburb = values.suburb;
  if (values.postcode) payload.postcode = values.postcode;
  return payload;
}

if (form) {
  // Handle interactive date & time slot selection
  form.querySelectorAll('[data-slot-date]').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('[data-slot-date]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const input = form.querySelector('#bookingDate');
      if (input) input.value = btn.dataset.slotDate;
    });
  });

  form.querySelectorAll('[data-slot-time]').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('[data-slot-time]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const input = form.querySelector('#bookingTime');
      if (input) input.value = btn.dataset.slotTime;
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    setStatus(form, '');

    const values = read();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      showErrors(form, errors)?.focus();
      setStatus(form, 'Please select your preferred time and complete the required fields.');
      return;
    }

    const button = form.querySelector('[data-submit]');
    setBusy(button, true);
    setStatus(form, 'Sending your request…');
    const result = await submitEnquiry(payloadFrom(values));
    setBusy(button, false);

    if (result.ok) {
      clearSessionKey(sessionStorage, 'booking');
      form.hidden = true;
      const successEl = document.querySelector('#booking-success');
      if (successEl) {
        const refEl = successEl.querySelector('[data-reference]');
        if (refEl) refEl.textContent = result.reference;
        const dateEl = successEl.querySelector('[data-confirmed-time]');
        if (dateEl) dateEl.textContent = `${values.date} at ${values.time}`;
        revealSuccess(successEl);
      }
    } else {
      setStatus(form, result.error || 'Unable to send your request right now. Please call 1800 008 883.');
    }
  });
}
