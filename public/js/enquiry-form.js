import { isAuPhone, isAuPostcode, isEmail, normalisePhone } from './lib/au.js';
import { clearSessionKey, sessionKey, submitEnquiry } from './lib/enquiry-client.js';
import { clearErrors, setBusy, setStatus, showErrors, showSuccess, showSummary } from './lib/ui.js';

const form = document.querySelector('[data-enquiry-form]');
const CATEGORIES = ['kitchen', 'bathroom', 'whole_home', 'extension', 'other'];
const startedAt = Date.now();

function validate(values) {
  const errors = {};
  if (values.name.length < 2) errors.name = 'Please enter your full name.';
  if (!isAuPhone(normalisePhone(values.phone))) errors.phone = 'Please enter a valid Australian phone number.';
  if (!isEmail(values.email)) errors.email = 'Please enter a valid email address.';
  if (!CATEGORIES.includes(values.category)) errors.category = 'Please choose a renovation type.';
  if (!values.suburb && !values.postcode) errors.postcode = 'Please enter your suburb or postcode.';
  else if (values.postcode && !isAuPostcode(values.postcode)) errors.postcode = 'Please enter a valid 4-digit Australian postcode.';
  if (values.details.length < 10) errors.details = 'Please tell us a little about your project (at least 10 characters).';
  if (!values.consent) errors.consent = 'Please confirm you agree to us contacting you about your enquiry.';
  return errors;
}

function read() {
  const data = new FormData(form);
  const text = (name) => String(data.get(name) ?? '').trim();
  return {
    name: text('name'), phone: text('phone'), email: text('email'), category: text('category'),
    suburb: text('suburb'), postcode: text('postcode'), timeline: text('timeline'), budgetRange: text('budgetRange'),
    details: text('details'), consent: data.get('consent') === 'on', website: text('website'),
  };
}

function payloadFrom(values) {
  const payload = {
    idempotencyKey: sessionKey(sessionStorage, 'contact'), source: 'contact-form', sourcePage: '/contact',
    name: values.name, phone: values.phone, email: values.email, category: values.category,
    details: values.details, consent: values.consent, website: values.website, formStartedAt: startedAt,
  };
  for (const key of ['suburb', 'postcode', 'timeline', 'budgetRange']) if (values[key]) payload[key] = values[key];
  return payload;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(form);
  setStatus(form, '');

  const values = read();
  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    showErrors(form, errors)?.focus();
    setStatus(form, 'Please fix the highlighted fields.');
    return;
  }

  const button = form.querySelector('[data-submit]');
  setBusy(button, true);
  setStatus(form, 'Sending your enquiry…');
  const result = await submitEnquiry(payloadFrom(values));
  setBusy(button, false);

  if (result.ok) {
    clearSessionKey(sessionStorage, 'contact');
    form.hidden = true;
    showSuccess(result.reference);
    return;
  }
  setStatus(form, '');
  if (result.kind === 'validation' && result.fields) showErrors(form, result.fields)?.focus();
  showSummary(form, result.retryable ? `${result.message} You can press “Send enquiry” again — it will not create a duplicate.` : result.message);
});
