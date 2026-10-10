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
      const record = {
        ...row, id: randomUUID(), status: 'new', created_at: new Date(),
        notification_status: 'pending', notification_attempts: 0, notification_last_error: null,
        notification_next_attempt_at: null, notification_claimed_at: null,
      };
      rows.push(record);
      return { ok: true, record };
    },
    async markNotification(id, status, meta = {}) {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      row.notification_status = status;
      row.notification_claimed_at = null;
      if (meta.attempts !== undefined) row.notification_attempts = meta.attempts;
      row.notification_last_error = status === 'failed' ? (meta.error ?? 'notify_error') : null;
      row.notification_next_attempt_at = status === 'failed' ? (meta.nextAttemptAt ?? null) : null;
      if (status === 'sent') row.notified_at = meta.now ?? new Date();
    },
    /** Synchronous check-and-set, mirroring the atomic conditional UPDATE used in Postgres. */
    async claimDueNotifications({ now, limit, leaseMs, pendingGraceMs, maxAttempts }) {
      const t = now.getTime();
      const due = rows.filter((r) =>
        (r.notification_status === 'failed' || r.notification_status === 'pending')
        && r.notification_attempts < maxAttempts
        && (!r.notification_next_attempt_at || r.notification_next_attempt_at.getTime() <= t)
        && (!r.notification_claimed_at || r.notification_claimed_at.getTime() <= t - leaseMs)
        && (r.notification_status === 'failed' || r.created_at.getTime() <= t - pendingGraceMs))
        .sort((a, b) => a.created_at - b.created_at)
        .slice(0, limit);
      for (const row of due) row.notification_claimed_at = now;
      return due.map((r) => ({ ...r }));
    },
  };
}
