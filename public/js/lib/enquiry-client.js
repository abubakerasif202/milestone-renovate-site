const ENDPOINT = '/api/enquiries';
const PHONE_FALLBACK = 'Please call us on 1800 008 883.';
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Submit an enquiry. Re-sending the same payload (same idempotencyKey) is safe: the server
 * returns the original reference instead of creating a second lead.
 *
 * @returns {Promise<{ok:true, reference:string, duplicate:boolean} | {ok:false, kind:'validation'|'rate_limited'|'unavailable'|'network'|'rejected', message:string, fields?:Record<string,string>, retryable:boolean}>}
 */
export async function submitEnquiry(payload, { fetchImpl = fetch, endpoint = ENDPOINT, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  let response;
  try {
    response = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return { ok: false, kind: 'network', retryable: true, message: `The request is taking too long, so we cannot confirm it was received. Please try again — it will not create a duplicate. ${PHONE_FALLBACK}` };
    }
    return { ok: false, kind: 'network', retryable: true, message: `We could not reach the server. Your details have not been sent. Check your connection and try again. ${PHONE_FALLBACK}` };
  }

  let body = null;
  try { body = await response.json(); } catch { /* non-JSON error page */ }

  if (response.ok && body?.ok === true && typeof body.reference === 'string') {
    return { ok: true, reference: body.reference, duplicate: body.duplicate === true };
  }
  if (response.status === 422 && body?.fields) return { ok: false, kind: 'validation', retryable: false, fields: body.fields, message: body.message ?? 'Please check the highlighted fields.' };
  if (response.status === 429) return { ok: false, kind: 'rate_limited', retryable: false, message: body?.message ?? `Too many attempts. ${PHONE_FALLBACK}` };
  if (response.status === 413) return { ok: false, kind: 'rejected', retryable: false, message: `Your message is too long to send. Please shorten the project details. ${PHONE_FALLBACK}` };
  if (response.status === 400 || response.status === 403 || response.status === 415) return { ok: false, kind: 'rejected', retryable: false, message: body?.message ?? 'We could not accept this submission.' };
  return { ok: false, kind: 'unavailable', retryable: true, message: body?.message ?? `We could not save your enquiry just now. Nothing has been sent. ${PHONE_FALLBACK}` };
}

/** One idempotency key per form session, so a retry after a failure cannot create a second lead. */
export function sessionKey(storage, name) {
  const id = `mr-key-${name}`;
  try {
    const existing = storage.getItem(id);
    if (existing) return existing;
    const created = crypto.randomUUID();
    storage.setItem(id, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearSessionKey(storage, name) {
  try { storage.removeItem(`mr-key-${name}`); } catch { /* storage unavailable */ }
}
