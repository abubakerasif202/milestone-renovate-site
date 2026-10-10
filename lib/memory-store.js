import { randomUUID } from 'node:crypto';

/**
 * In-memory store with the same contract as the Supabase store.
 * Used by tests and the local dev server only; the production handler never selects it.
 */
export function createMemoryStore({ failInsert = false } = {}) {
  const rows = [];
  return {
    rows,
    setFailInsert(value) { failInsert = value; },
    async findByIdempotencyKey(key) {
      return rows.find((r) => r.idempotency_key === key) ?? null;
    },
    async countRecentByIp(ipHash, since) {
      return rows.filter((r) => r.ip_hash === ipHash && r.created_at >= since).length;
    },
    async findRecentByDedupe(hash, since) {
      return rows.find((r) => r.dedupe_hash === hash && r.created_at >= since) ?? null;
    },
    async insertEnquiry(row) {
      if (failInsert) return { ok: false, code: 'simulated_failure' };
      if (rows.some((r) => r.idempotency_key === row.idempotency_key)) return { ok: false, conflict: 'idempotency' };
      if (rows.some((r) => r.reference === row.reference)) return { ok: false, conflict: 'reference' };
      const record = { ...row, id: randomUUID(), status: 'new', notification_status: 'pending', created_at: new Date() };
      rows.push(record);
      return { ok: true, record };
    },
    async markNotification(id, status) {
      const row = rows.find((r) => r.id === id);
      if (row) row.notification_status = status;
    },
  };
}
