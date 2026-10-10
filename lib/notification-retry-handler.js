import { timingSafeEqual } from 'node:crypto';
import { retryDueNotifications } from './notification-retry.js';
import { log } from './log.js';

const HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
const MIN_SECRET_LENGTH = 16;

function send(res, status, body, extra = {}) {
  res.writeHead(status, { ...HEADERS, ...extra });
  res.end(JSON.stringify(body));
}

function bearerMatches(header, secret) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(String(header ?? ''));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Cron-triggered endpoint that re-sends failed staff notifications.
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET` (GET). It fails closed when no secret is configured.
 * @param {() => object | null} getDeps
 * @param {() => string | undefined} getSecret
 */
export function createRetryHandler(getDeps, getSecret = () => process.env.CRON_SECRET) {
  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { ok: false, code: 'method_not_allowed' }, { Allow: 'GET, POST' });

    const secret = getSecret();
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      log('error', { event: 'notify.retry_not_configured', code: 'missing_cron_secret' });
      return send(res, 503, { ok: false, code: 'not_configured' });
    }
    if (!bearerMatches(req.headers.authorization, secret)) return send(res, 401, { ok: false, code: 'unauthorized' });

    const deps = getDeps();
    if (!deps) return send(res, 503, { ok: false, code: 'not_configured' });

    try {
      const result = await retryDueNotifications({ store: deps.store, notifier: deps.notifier });
      log('info', { event: 'notify.retry_run', code: `claimed=${result.claimed};sent=${result.sent};failed=${result.failed};exhausted=${result.exhausted}` });
      return send(res, 200, { ok: true, ...result });
    } catch (error) {
      log('error', { event: 'notify.retry_failed', code: error?.code ?? 'unknown' });
      return send(res, 503, { ok: false, code: 'storage_unavailable' });
    }
  };
}
