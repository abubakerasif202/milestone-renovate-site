import { createClient } from '@supabase/supabase-js';

const TABLE = 'enquiries';
const UNIQUE_VIOLATION = '23505';

/** Server-only Supabase store. Requires the service-role key; never import from browser code. */
export function createSupabaseStore({ url, serviceRoleKey }) {
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const fail = (error) => Object.assign(new Error('database error'), { code: error.code ?? 'db_error' });

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
    async markNotification(id, status) {
      const patch = { notification_status: status, ...(status === 'sent' ? { notified_at: new Date().toISOString() } : {}) };
      const { error } = await db.from(TABLE).update(patch).eq('id', id);
      if (error) throw fail(error);
    },
  };
}
