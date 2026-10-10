import { createHash, createHmac, randomInt } from 'node:crypto';
import { CONSENT_VERSION, enquirySchema, fieldErrors } from './enquiry-schema.js';
import { log } from './log.js';
import { attemptNotification } from './notification-retry.js';

export const RATE_LIMIT = Object.freeze({ max: 5, windowMs: 60 * 60 * 1000 });
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MIN_FILL_MS = 2500;
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_REFERENCE_ATTEMPTS = 4;

export function generateReference() {
  let out = 'MR-';
  for (let i = 0; i < 8; i += 1) out += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return out;
}

export function hashIp(ip, secret) {
  return ip ? createHmac('sha256', secret).update(String(ip)).digest('hex') : null;
}

export function dedupeHash(data) {
  const basis = [data.email, data.category, (data.details ?? '').toLowerCase().replace(/\s+/g, ' '), JSON.stringify(data.wizard ?? {})].join('|');
  return createHash('sha256').update(basis).digest('hex');
}

const respond = (status, body, headers = {}) => ({ status, body, headers });

/**
 * Validate, rate-limit, de-duplicate and durably store an enquiry; then notify staff.
 * A 201/200 success is only ever returned after the row is stored.
 *
 * @param {{ body: unknown, ip?: string }} request
 * @param {{ store: object, notifier?: object, ipSecret: string, now?: () => Date }} deps
 */
export async function createEnquiry({ body, ip }, { store, notifier, ipSecret, now = () => new Date() }) {
  const raw = body && typeof body === 'object' ? body : {};

  if (typeof raw.website === 'string' && raw.website.trim() !== '') {
    log('warn', { event: 'enquiry.rejected', code: 'honeypot' });
    return respond(400, { ok: false, code: 'rejected', message: 'We could not accept this submission.' });
  }
  const { website: _honeypot, ...candidate } = raw;

  const parsed = enquirySchema.safeParse(candidate);
  if (!parsed.success) {
    return respond(422, { ok: false, code: 'validation_failed', message: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) });
  }
  const data = parsed.data;
  const nowMs = now().getTime();

  if (data.formStartedAt && nowMs - data.formStartedAt < MIN_FILL_MS) {
    log('warn', { event: 'enquiry.rejected', code: 'too_fast' });
    return respond(400, { ok: false, code: 'rejected', message: 'That was a little quick. Please review your details and try again.' });
  }

  const ipHash = hashIp(ip, ipSecret);

  try {
    const existingByKey = await store.findByIdempotencyKey(data.idempotencyKey);
    if (existingByKey) return respond(200, { ok: true, reference: existingByKey.reference, duplicate: true });

    if (ipHash) {
      const recent = await store.countRecentByIp(ipHash, new Date(nowMs - RATE_LIMIT.windowMs));
      if (recent >= RATE_LIMIT.max) {
        log('warn', { event: 'enquiry.rate_limited', code: 'rate_limited' });
        return respond(429, { ok: false, code: 'rate_limited', message: 'Too many enquiries from your connection. Please call us on 1800 008 883.' }, { 'Retry-After': String(RATE_LIMIT.windowMs / 1000) });
      }
    }

    const hash = dedupeHash(data);
    const existingByContent = await store.findRecentByDedupe(hash, new Date(nowMs - DEDUPE_WINDOW_MS));
    if (existingByContent) return respond(200, { ok: true, reference: existingByContent.reference, duplicate: true });

    const stored = await insertWithReference(store, {
      idempotency_key: data.idempotencyKey,
      dedupe_hash: hash,
      category: data.category,
      name: data.name,
      phone: data.phone,
      email: data.email,
      suburb: data.suburb ?? null,
      postcode: data.postcode ?? null,
      budget_range: data.budgetRange ?? null,
      timeline: data.timeline ?? null,
      details: data.details ?? null,
      wizard_data: data.wizard ?? null,
      source: data.source,
      source_page: data.sourcePage ?? null,
      consent_at: now().toISOString(),
      consent_version: CONSENT_VERSION,
      ip_hash: ipHash,
    });

    if (stored.duplicateOf) return respond(200, { ok: true, reference: stored.duplicateOf, duplicate: true });

    log('info', { event: 'enquiry.stored', reference: stored.reference, code: data.source });
    await notifyStaff({ store, notifier, record: stored, data, now });
    return respond(201, { ok: true, reference: stored.reference });
  } catch (error) {
    log('error', { event: 'enquiry.storage_failed', code: error?.code ?? 'unknown', retryable: true });
    return respond(503, { ok: false, code: 'storage_unavailable', retryable: true, message: 'We could not save your enquiry just now. Nothing has been sent — please try again, or call 1800 008 883.' });
  }
}

async function insertWithReference(store, row) {
  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const reference = generateReference();
    const result = await store.insertEnquiry({ ...row, reference });
    if (result.ok) return result.record;
    if (result.conflict === 'idempotency') {
      const existing = await store.findByIdempotencyKey(row.idempotency_key);
      if (existing) return { duplicateOf: existing.reference };
    }
    if (result.conflict !== 'reference') throw Object.assign(new Error('insert failed'), { code: result.code ?? 'insert_failed' });
  }
  throw Object.assign(new Error('reference collision'), { code: 'reference_exhausted' });
}

/** Notification failures never undo a stored lead; the outcome is recorded so a retry can pick it up. */
async function notifyStaff({ store, notifier, record, data, now }) {
  await attemptNotification({ store, notifier, row: record, enquiry: data, attempts: 1, now: now() });
}
