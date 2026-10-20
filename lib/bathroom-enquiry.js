// Email-only calculator submissions. Does not read or write enquiry storage.
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { log } from './log.js';
import { calculateBathroom, bathroomBrief, validateBathroomContact, BATHROOM_DEFAULTS } from '../public/js/lib/bathroom-calculator.js';
import { MIN_FILL_MS, RATE_LIMIT } from './enquiry-service.js';
const schema = z.object({
  enquiryType: z.literal('bathroom_renovation_calculator'), idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(120), postcode: z.string().trim().regex(/^\d{4}$/),
  email: z.string().trim().max(254), phone: z.string().trim().max(40), message: z.string().trim().max(4000),
  consent: z.literal(true), sourcePage: z.literal('/bathroom-renovation-cost'), formStartedAt: z.number().int().positive(),
  options: z.record(z.union([z.string(), z.boolean()])),
  costMin: z.number().finite(), costMax: z.number().finite(), weeksMin: z.number().finite(), weeksMax: z.number().finite(),
  website: z.string().max(200).optional(),
}).strict();
const response = (status, body, headers = {}) => ({ status, body, headers });
export function createBathroomEnquiryService() {
  // Bounded instance-local anti-spam only. Resend's idempotency key also survives instance restarts.
  const rates = new Map(); const requests = new Map();
  return async ({ body, ip }, { notifier, ipSecret, now = () => Date.now() }) => {
    if (!notifier?.enabled || !ipSecret) return response(503, { ok: false, code: 'not_configured', message: 'Online email submission is unavailable. Please use the contact link with your estimate or call 1800 008 883.' });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return response(422, { ok: false, fields: Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0] ?? 'form', issue.message])) });
    const data = parsed.data;
    const fields = validateBathroomContact(data);
    let totals;
    try { totals = calculateBathroom(data.options); } catch { fields.options = 'Review your bathroom selections.'; }
    if (Object.keys(fields).length) return response(422, { ok: false, fields });
    const time = now();
    if (data.website?.trim() || time - data.formStartedAt < MIN_FILL_MS || data.formStartedAt > time) return response(400, { ok: false, message: 'Please review your details and try again.' });
    const hash = value => createHmac('sha256', ipSecret).update(value).digest('hex');
    const options = { ...BATHROOM_DEFAULTS, ...data.options };
    const digest = hash(JSON.stringify([data.name, data.email, data.phone, data.postcode, data.message, options, data.consent]));
    const key = hash(data.idempotencyKey);
    for (const [id, entry] of requests) if (entry.expires <= time) requests.delete(id);
    const previous = requests.get(key);
    if (previous) {
      if (previous.digest !== digest) return response(409, { ok: false, message: 'Your details changed. Please start a new request before sending again.' });
      return previous.pending;
    }
    for (const [id, entry] of rates) if (entry.expires <= time) rates.delete(id);
    const ipKey = hash(ip || 'unknown');
    const rate = rates.get(ipKey) ?? { count: 0, expires: time + RATE_LIMIT.windowMs };
    if (rate.count >= RATE_LIMIT.max || rates.size >= 10000 || requests.size >= 10000) return response(429, { ok: false, message: 'Too many attempts. Please call 1800 008 883.' }, { 'Retry-After': '3600' });
    rate.count += 1; rates.set(ipKey, rate);
    // Stable across instances; changed content gets a different reference rather than a false success.
    const reference = `MR-BC-${hash(key + digest).slice(0, 20).toUpperCase()}`;
    const entry = { digest, expires: time + 24 * 60 * 60 * 1000 };
    entry.pending = Promise.resolve().then(async () => {
      try {
        await notifier.sendStaffNotification({ reference, enquiry: { ...data, ...totals, options, category: 'bathroom', source: data.enquiryType, details: bathroomBrief(options) + '\nMessage: ' + (data.message || 'None') + '\nConsent: agreed to contact; wording bathroom-email-2026-10-v1; privacy /privacy; received ' + new Date(time).toISOString() } });
        return response(201, { ok: true, reference, status: 'email_accepted' });
      } catch {
        log('error', { event: 'calculator.email_unconfirmed', code: 'provider_unconfirmed', reference });
        requests.delete(key);
        return response(503, { ok: false, code: 'email_unconfirmed', message: 'We could not confirm email acceptance. Please retry or use the contact link with your estimate. Your reference remains the same on retry.' });
      }
    });
    requests.set(key, entry);
    return entry.pending;
  };
}
