import { createBathroomEnquiryService } from './bathroom-enquiry.js';
import { createEnquiry } from './enquiry-service.js';
import { createResendNotifier } from './notifier.js';
import { createSupabaseStore } from './supabase-store.js';
import { log } from './log.js';

const MAX_BODY_BYTES = 20_000;
const NO_STORE = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

/** Build runtime dependencies from environment. Returns null if required config is missing. */
export function depsFromEnv(env = process.env) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IP_HASH_SECRET } = env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IP_HASH_SECRET) return null;
  return {
    store: createSupabaseStore({ url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY }),
    notifier: createResendNotifier({ apiKey: env.RESEND_API_KEY, to: env.NOTIFY_TO_EMAIL, from: env.NOTIFY_FROM_EMAIL }),
    ipSecret: IP_HASH_SECRET,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'https://milestonerenovate.com').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

export function calculatorDepsFromEnv(env = process.env) {
  if (!env.IP_HASH_SECRET) return null;
  const notifier = createResendNotifier({ apiKey: env.RESEND_API_KEY, to: env.NOTIFY_TO_EMAIL, from: env.NOTIFY_FROM_EMAIL });
  if (!notifier.enabled) return null;
  return { notifier, ipSecret: env.IP_HASH_SECRET, allowedOrigins: (env.ALLOWED_ORIGINS ?? 'https://milestonerenovate.com').split(',').map(value => value.trim()).filter(Boolean) };
}

const clientIp = (req) => String(req.headers['x-real-ip'] ?? req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '').split(',')[0].trim();

function send(res, status, body, extra = {}) {
  res.writeHead(status, { ...NO_STORE, ...extra });
  res.end(JSON.stringify(body));
}

function sameOrigin(req, allowedOrigins) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser callers carry no Origin; they are still rate limited
  const host = req.headers.host;
  if (allowedOrigins.includes(origin)) return true;
  try {
    return new URL(origin).host === host && (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.endsWith('.vercel.app'));
  } catch {
    return false;
  }
}

async function readJson(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** @param {() => object | null} getDeps lazily resolves dependencies (null = not configured) */
export function createHandler(getDeps, getCalculatorDeps = getDeps) {
  const calculatorEnquiry = createBathroomEnquiryService();
  return async function handler(req, res) {
    if (req.method !== 'POST') return send(res, 405, { ok: false, code: 'method_not_allowed' }, { Allow: 'POST' });

    if (!String(req.headers['content-type'] ?? '').includes('application/json')) return send(res, 415, { ok: false, code: 'unsupported_media_type' });
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) return send(res, 413, { ok: false, code: 'payload_too_large' });

    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      return send(res, error.status === 413 ? 413 : 400, { ok: false, code: error.status === 413 ? 'payload_too_large' : 'invalid_json' });
    }

    const isCalculator = body?.enquiryType === 'bathroom_renovation_calculator';
    const deps = isCalculator ? getCalculatorDeps() : getDeps();
    if (!deps) {
      log('error', { event: 'enquiry.not_configured', code: 'missing_env' });
      return send(res, 503, { ok: false, code: 'not_configured', message: 'Online enquiries are temporarily unavailable. Please call 1800 008 883.' });
    }
    if (!sameOrigin(req, deps.allowedOrigins ?? [])) return send(res, 403, { ok: false, code: 'forbidden_origin' });
    const result = await (isCalculator ? calculatorEnquiry : createEnquiry)({ body, ip: clientIp(req) }, deps);
    return send(res, result.status, result.body, result.headers);
  };
}
