import { isAuPhone, isAuPostcode, isEmail, normalisePhone } from './lib/au.js';
import { clearSessionKey, sessionKey, submitEnquiry } from './lib/enquiry-client.js';
import { clearErrors, setBusy, setStatus, showErrors } from './lib/ui.js';

const form = document.querySelector('[data-quote-audit-form]');
const startedAt = Date.now();

function validate(values) {
  const errors = {};
  if (values.name.length < 2) errors.name = 'Please enter your full name.';
  if (!isAuPhone(normalisePhone(values.phone))) errors.phone = 'Please enter a valid Australian phone number.';
  if (!isEmail(values.email)) errors.email = 'Please enter a valid email address.';
  if (!values.postcode && !values.suburb) errors.postcode = 'Please enter your suburb or postcode.';
  else if (values.postcode && !isAuPostcode(values.postcode)) errors.postcode = 'Please enter a valid 4-digit Australian postcode.';
  if (!values.details || values.details.length < 10) errors.details = 'Please describe the quote scope or paste the items you would like audited.';
  if (!values.consent) errors.consent = 'Please confirm you agree to us contacting you regarding your quote audit.';
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
    quotedAmount: text('quotedAmount'),
    builderName: text('builderName'),
    details: text('details'),
    consent: data.get('consent') === 'on',
    website: text('website'),
  };
}

function payloadFrom(values) {
  const meta = [
    values.quotedAmount ? `Quote Amount: ${values.quotedAmount}` : null,
    values.builderName ? `Quoted By: ${values.builderName}` : null,
  ].filter(Boolean).join(' | ');

  const combinedDetails = `[Second Opinion / Quote Audit Request${meta ? ` - ${meta}` : ''}] ${values.details}`.trim();

  const payload = {
    idempotencyKey: sessionKey(sessionStorage, 'quote-audit'),
    source: 'contact-form',
    sourcePage: '/quote-audit',
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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    setStatus(form, '');

    const values = read();
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      showErrors(form, errors)?.focus();
      setStatus(form, 'Please complete the highlighted fields to submit your quote for review.');
      return;
    }

    const button = form.querySelector('[data-submit]');
    setBusy(button, true);
    setStatus(form, 'Submitting quote for scope review…');
    const result = await submitEnquiry(payloadFrom(values));
    setBusy(button, false);

    if (result.ok) {
      clearSessionKey(sessionStorage, 'quote-audit');
      form.hidden = true;
      const successEl = document.querySelector('#quote-audit-success');
      if (successEl) {
        successEl.hidden = false;
        const refEl = successEl.querySelector('[data-reference]');
        if (refEl) refEl.textContent = result.reference;
        successEl.focus();
      }
    } else {
      setStatus(form, result.error || 'Unable to submit right now. Please call 1800 008 883.');
    }
  });
}
