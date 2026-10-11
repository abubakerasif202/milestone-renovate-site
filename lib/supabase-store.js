import { createClient } from '@supabase/supabase-js';

const TABLE = 'enquiries';
const UNIQUE_VIOLATION = '23505';
const DB_TIMEOUT_MS = 8000;
const timeoutFetch = (input, init = {}) => fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(DB_TIMEOUT_MS) });

/** Server-only Supabase store. Requires the service-role key; never import from browser code. */
export function createSupabaseStore({ url, serviceRoleKey }) {
  const db = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timeoutFetch },
  });

  const fail = (error) => Object.assign(new Error('database error'), { code: error.code ?? 'db_error' });
  const iso = (ms) => new Date(ms).toISOString();

  return {
    async findByIdempotencyKey(key) {
      const { data, error } = await db.from(TABLE).select('id, reference').eq('idempotency_key', key).maybeSingle();
      if (error) throw fail(error);
      return data;
    },
    async countRecentByIp(ipHash, since) {
      const { count, error } = await db
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', since.toISOString());
      if (error) throw fail(error);
      return count ?? 0;
    },
    async findRecentByDedupe(hash, since) {
      const { data, error } = await db
        .from(TABLE)
        .select('id, reference')
        .eq('dedupe_hash', hash)
        .gte('created_at', since.toISOString())
        .limit(1)
        .maybeSingle();
      if (error) throw fail(error);
      return data;
    },
    async insertEnquiry(row) {
      const { data, error } = await db.from(TABLE).insert(row).select('id, reference').single();
      if (!error) return { ok: true, record: data };
      if (error.code === UNIQUE_VIOLATION) {
        const text = `${error.message} ${error.details ?? ''}`;
        if (text.includes('idempotency_key')) return { ok: false, conflict: 'idempotency' };
        if (text.includes('reference')) return { ok: false, conflict: 'reference' };
      }
      return { ok: false, code: error.code ?? 'db_error' };
    },
    async markNotification(id, status, meta = {}) {
      const patch = {
        notification_status: status,
        notification_claimed_at: null,
        notification_last_error: status === 'failed' ? (meta.error ?? 'notify_error') : null,
        notification_next_attempt_at: status === 'failed' && meta.nextAttemptAt ? meta.nextAttemptAt.toISOString() : null,
        ...(meta.attempts !== undefined ? { notification_attempts: meta.attempts } : {}),
        ...(status === 'sent' ? { notified_at: (meta.now ?? new Date()).toISOString() } : {}),
      };
      const { error } = await db.from(TABLE).update(patch).eq('id', id);
      if (error) throw fail(error);
    },
    /**
     * Claim due rows with an optimistic lock: the UPDATE only matches while the row still has the attempt
     * count we read and no live lease, so of two racing workers exactly one gets the row back.
     */
    async claimDueNotifications({ now, limit, leaseMs, pendingGraceMs, maxAttempts }) {
      const t = now.getTime();
      const { data: candidates, error } = await db
        .from(TABLE)
        .select('id, notification_status, notification_attempts, created_at')
        .in('notification_status', ['pending', 'failed'])
        .lt('notification_attempts', maxAttempts)
        .or(`notification_next_attempt_at.is.null,notification_next_attempt_at.lte.${iso(t)}`)
        .or(`notification_claimed_at.is.null,notification_claimed_at.lte.${iso(t - leaseMs)}`)
        .order('created_at', { ascending: true })
        .limit(limit * 2);
      if (error) throw fail(error);

      const claimed = [];
      for (const candidate of candidates ?? []) {
        if (claimed.length >= limit) break;
        if (candidate.notification_status === 'pending' && new Date(candidate.created_at).getTime() > t - pendingGraceMs) continue;
        const { data, error: claimError } = await db
          .from(TABLE)
          .update({ notification_claimed_at: iso(t) })
          .eq('id', candidate.id)
          .eq('notification_attempts', candidate.notification_attempts)
          .in('notification_status', ['pending', 'failed'])
          .or(`notification_claimed_at.is.null,notification_claimed_at.lte.${iso(t - leaseMs)}`)
          .select('*');
        // Keep what was already claimed: those rows are leased and must still be processed this run.
        if (claimError) break;
        if (data?.length === 1) claimed.push(data[0]);
      }
      return claimed;
    },
  };
}
